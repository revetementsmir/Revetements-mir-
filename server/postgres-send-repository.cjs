'use strict';
// query(sql,params) must use a private worker DB connection (never in dist/).
// A checked-out connection is required for each transaction.
function createRepository(connection){
  return {
    async requeue(id){
      const r=await connection.query(`with retried as (update mir_core.send_jobs j set status='queued',last_error=null
        from mir_core.orders o where j.id=$1 and j.status='uncertain'
        and (o.organization_id,o.id)=(j.organization_id,j.order_id)
        and o.status='approved' and o.revision=j.revision returning j.organization_id,j.order_id,j.id)
        insert into mir_core.order_events(organization_id,order_id,event_type,actor_id,details)
        select r.organization_id,r.order_id,'send-retry',o.owner_id,jsonb_build_object('jobId',r.id,'actorType','server-worker')
        from retried r join mir_core.orders o on (o.organization_id,o.id)=(r.organization_id,r.order_id)
        returning id`,[id]);
      return {state:r.rows.length?'queued':'unchanged'};
    },
    async resolveUncertain(id,messageId){
      if(!messageId)throw Error('Preuve prestataire requise');
      await connection.query('begin');
      try{
        const r=await connection.query(`update mir_core.send_jobs set status='accepted',provider_message_id=$2
          where id=$1 and status='uncertain' returning organization_id,order_id,id`,[id,messageId]);
        if(!r.rows.length){await connection.query('rollback');return {state:'unchanged'};}
        const j=r.rows[0];
        await connection.query(`insert into mir_core.send_attempts(organization_id,job_id,status,provider_message_id) values($1,$2,'accepted',$3)`,[j.organization_id,id,messageId]);
        await connection.query(`insert into mir_core.order_events(organization_id,order_id,event_type,actor_id,details)
          select organization_id,id,'send-reconciled',owner_id,$3 from mir_core.orders where organization_id=$1 and id=$2`,
          [j.organization_id,j.order_id,JSON.stringify({jobId:id,messageId,actorType:'server-worker'})]);
        await connection.query('commit');return {state:'accepted'};
      }catch(error){await connection.query('rollback');throw error;}
    },
    async claim(){
      const {rows}=await connection.query(`with candidate as (
        select j.organization_id,j.id from mir_core.send_jobs j
        join mir_core.orders o on (o.organization_id,o.id)=(j.organization_id,j.order_id)
        join mir_core.suppliers s on (s.organization_id,s.id)=(o.organization_id,o.supplier_id)
        where (j.status='queued' or (j.status='processing' and j.lease_until<now()))
          and o.status='approved' and o.revision=j.revision
          and not s.archived and s.verified_at is not null and s.email=j.recipient
        order by j.created_at for update of j skip locked limit 1
      ), leased as (
        update mir_core.send_jobs j set status='processing',lease_until=now()+interval '5 minutes',attempts=attempts+1
        from candidate c where (j.organization_id,j.id)=(c.organization_id,c.id) returning j.*
      ) select l.*,d.object_path,d.sha256 from leased l join mir_core.documents d
        on (d.organization_id,d.id)=(l.organization_id,l.document_id)`);
      return rows[0]||null;
    },
    async finish(job,result){
      await connection.query('begin');
      try{
        const r=await connection.query(`update mir_core.send_jobs set status=$1,provider_message_id=$2,last_error=$3,lease_until=null
          where organization_id=$4 and id=$5 and status='processing' and attempts=$6 returning id`,
          [result.status,result.messageId||null,result.error||null,job.organization_id,job.id,job.attempts]);
        if(!r.rows.length){await connection.query('rollback');return false;}
        await connection.query(`insert into mir_core.send_attempts(organization_id,job_id,status,provider_message_id) values($1,$2,$3,$4)`,[job.organization_id,job.id,result.status,result.messageId||null]);
        await connection.query(`insert into mir_core.order_events(organization_id,order_id,event_type,actor_id,details)
          select $1,$2,$3,owner_id,$4 from mir_core.orders where organization_id=$1 and id=$2`,
          [job.organization_id,job.order_id,'send-'+result.status,JSON.stringify({jobId:job.id,messageId:result.messageId||null,error:result.error||null,actorType:'server-worker'})]);
        await connection.query('commit');return true;
      }catch(error){await connection.query('rollback');throw error;}
    }
  };
}
module.exports={createRepository};
