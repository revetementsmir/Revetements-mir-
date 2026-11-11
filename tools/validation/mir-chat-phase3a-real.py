"""Explicitly authorized MIR TEST only. No account creation or administrative DDL.

Uses existing sandbox credentials; never logs tokens, signed URLs or unrelated
message bodies. Only uniquely tagged QA jobs/files/messages are added. No existing
job assignment is replaced. Revocation tests need a separate scoped operator.
"""
import os, sys, json, re, uuid, base64, urllib.request, urllib.error
import concurrent.futures, time, hashlib, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
PROJECT = 'hxtztkmbfpmzrieccwsg'
HOST = 'https://' + PROJECT + '.supabase.co'
ORG = '8aabc1c9-bd01-4ca1-ad62-b89b575a6bf9'
FOREIGN = '3005c762-de14-4ab0-8bc8-16c4be92d0a4'
# CRC/IDAT validated by the local binary-inspector suite, not just an image header.
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg==')

class Certification:
    def __init__(self):
        self.key = os.environ.get('MIR_SANDBOX_PUBLISHABLE_KEY') or re.search(
            r"environment:'test'.*?publishableKey:\s*\"([^\"]+)\"", (ROOT/'dist/portal-config.js').read_text(), re.S).group(1)
        self.output = pathlib.Path(os.environ.get('MIR_CHAT_REAL_REPORT', '/tmp/mir-chat-phase3a-real-current.json'))
        self.sessions, self.roles, self.links = {}, {}, {}
        self.tag = 'QA3A-' + str(uuid.uuid4())
        self.report = {'kind':'real-MIR-TEST-HTTPS','projectId':PROJECT,'production':'not-accessed',
            'startedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'workSha':os.environ.get('MIR_CHAT_WORK_SHA'),
            'checks':[], 'observations':[], 'fixtures':{}, 'missing':[]}
    def save(self):
        self.report['passed'] = sum(c['status']=='passed' for c in self.report['checks'])
        self.report['failed'] = sum(c['status']=='failed' for c in self.report['checks'])
        self.output.parent.mkdir(parents=True,exist_ok=True)
        self.output.write_text(json.dumps(self.report,indent=2)+'\n')
    def request(self,method,path,body=None,actor=None,mime='application/json',absolute=False):
        headers = {} if absolute else {'apikey':self.key}
        if actor: headers['Authorization']='Bearer '+self.sessions[actor]['token']
        if body is not None: headers['Content-Type']=mime
        raw=json.dumps(body).encode() if body is not None and mime=='application/json' else body
        url=path if absolute else HOST+path
        # Absolute URLs are only already-issued links to the pinned TEST host.
        if not url.startswith(HOST+'/'): raise ValueError('Non-TEST URL refused')
        try:r=urllib.request.urlopen(urllib.request.Request(url,data=raw,headers=headers,method=method),timeout=45)
        except urllib.error.HTTPError as e:r=e
        data=r.read()
        try:parsed=json.loads(data)
        except (ValueError,UnicodeDecodeError):parsed=None
        return {'status':r.status,'data':parsed,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    def rpc(self,actor,name,args):return self.request('POST','/rest/v1/rpc/'+name,args,actor)
    def check(self,name,condition,evidence=None):
        self.report['checks'].append({'name':name,'status':'passed' if condition else 'failed',
            'at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'evidence':evidence})
        self.save()
        print(('PASS ' if condition else 'FAIL ')+name,flush=True)
        if not condition:raise AssertionError(name)
    def ok(self,r):return r['status']==200
    def denied(self,r):return r['status'] in (400,401,403,404,413)
    def authenticate(self):
        for key in ['ADMIN','BOSS','CHEF','CHEF_EQUIPE','EMPLOYEE','ASSISTANT','WAREHOUSE','OTHER_CLIENT','OUTSIDER']:
            email=os.environ.get('MIR_SANDBOX_'+key+'_EMAIL');pw=os.environ.get('MIR_SANDBOX_'+key+'_PASSWORD')
            if not email or not pw:continue
            r=self.request('POST','/auth/v1/token?grant_type=password',{'email':email,'password':pw})
            if not self.ok(r) or not r['data'].get('access_token'):raise RuntimeError('Sandbox authentication failed: '+key)
            self.sessions[key]={'token':r['data']['access_token'],'id':r['data']['user']['id']}
            account=self.rpc(key,'mir_account_snapshot',{})
            if not self.ok(account) or account['data'].get('organizationId')!=ORG:continue
            op=self.rpc(key,'mir_employee_operations_snapshot',{'org':ORG,'job':None})
            if not self.ok(op):continue
            role='admin' if account['data'].get('role')=='admin' else op['data'].get('role')
            self.roles.setdefault(role,key)
        self.report['actors']=[{'role':role,'userId':self.sessions[key]['id']} for role,key in self.roles.items()]
        self.report['missing']=[r for r in ['admin','boss','assistant','chef_equipe','employe'] if r not in self.roles]
        self.save()
        return {'roles':list(self.roles),'missing':self.report['missing']}
    def assign(self,name,user):
        r=self.rpc(self.roles['admin'],'mir_assign_job',{'org':ORG,'job_name':name,'employee':user})
        self.check('QA assignment additive '+name[-12:],self.ok(r),{'status':r['status']})
        return r['data']['id'] if isinstance(r['data'],dict) else r['data']
    def setup(self):
        admin=self.roles['admin'];employee=self.roles['employe'];chef=self.roles['chef_equipe']
        self.employee,self.chef=employee,chef
        name='[QA PHASE3A] '+self.tag
        self.job=self.assign(name,self.sessions[employee]['id'])
        same=self.assign(name,self.sessions[chef]['id'])
        self.check('additive assignment keeps same job',same==self.job)
        args={'org':ORG,'job':self.job}
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            calls=list(pool.map(lambda _:self.rpc(employee,'mir_conversation_job',args),range(8)))
        self.con=calls[0]['data']
        self.check('8 concurrent official conversation requests: one id',all(self.ok(r) and r['data']==self.con for r in calls),{'statuses':[r['status'] for r in calls],'conversationId':self.con})
        self.path=f'{ORG}/message/{self.con}/{self.sessions[chef]["id"]}/{uuid.uuid4()}.png'
        self.report['fixtures'].update(jobId=self.job,conversationId=self.con,tag=self.tag,validObjectPath=self.path)
        self.save()
    def upload(self,actor,path,raw=PNG,mime='image/png'):
        return self.request('POST','/storage/v1/object/mir-internal/'+path,raw,actor,mime)
    def validate(self,actor,path,conversation=None):
        return self.rpc(actor,'mir_message_attachment_validate',{'org':ORG,'conversation':conversation or self.con,'object_path':path})
    def send(self,actor,body,attachment=None,request_id=None,conversation=None):
        return self.rpc(actor,'mir_message_send',{'org':ORG,'conversation':conversation or self.con,'body':body,'job':None,'plan':None,'attachment':attachment,'request_id':request_id or str(uuid.uuid4())})
    def sign(self,actor,path,key,ttl):
        r=self.request('POST','/storage/v1/object/sign/mir-internal/'+path,{'expiresIn':ttl},actor)
        if self.ok(r):
            url=r['data'].get('signedURL') or r['data'].get('signedUrl')
            self.links[key]={'url':HOST+'/storage/v1'+url,'issued':time.time(),'ttl':ttl}
        return {'status':r['status'],'ttl':ttl}
    def signed_check(self,key):
        link=self.links[key]
        r=self.request('GET',link['url'],absolute=True)
        return {'status':r['status'],'bytes':r['bytes'],'sha256':r['sha256'],'ageSeconds':round(time.time()-link['issued'],1),'ttl':link['ttl']}
    def core(self):
        self.setup();emp=self.employee;chef=self.chef
        for role,key in self.roles.items():
            args={'org':ORG,'conversation':self.con,'page_size':20,'page_before':None}
            r=self.rpc(key,'mir_chat_messages',args)
            # Warehouse without a linked delivery operation must not see this job.
            expected=self.denied(r) if role=='warehouse' else self.ok(r)
            self.check('real role job permission '+role,expected,{'status':r['status']})
            r=self.rpc(key,'mir_chat_messages',{**args,'org':FOREIGN})
            self.check('existing other organization refused '+role,self.denied(r),{'status':r['status']})
        r=self.upload(chef,self.path);self.check('valid PNG Storage upload',self.ok(r),{'status':r['status'],'bytes':len(PNG)})
        r=self.validate(chef,self.path);self.check('valid PNG final server metadata and owner',self.ok(r) and r['data'].get('size')==len(PNG),{'status':r['status'],'metadata':r['data'] if self.ok(r) else None})
        r=self.send(chef,self.tag+' PNG',self.path);self.check('valid PNG attached to message',self.ok(r),{'status':r['status']});self.attachmentMessage=r['data']['id']
        missing=self.path.rsplit('/',1)[0]+'/'+str(uuid.uuid4())+'.png'
        r=self.validate(chef,missing);self.check('nonexistent object refused',self.denied(r),{'status':r['status']})
        r=self.validate(emp,self.path);self.check('attachment owned by another user refused',self.denied(r),{'status':r['status']})
        # Preserve the existing business matrix: Employee -> Assistant/Boss;
        # Employee -> Chef only when both are current members of the same team.
        private_target=self.roles.get('assistant') or self.roles.get('boss') or chef
        private=self.rpc(emp,'mir_conversation_private',{'org':ORG,'other':self.sessions[private_target]['id']})
        self.check('existing private conversation API preserved',self.ok(private),{'status':private['status']})
        r=self.validate(chef,self.path,private['data']);self.check('file from another conversation refused',self.denied(r),{'status':r['status']})
        for label,bad in [('tenant',self.path.replace(ORG,FOREIGN)),('conversation',self.path.replace(self.con,str(uuid.uuid4()))),('owner',self.path.replace(self.sessions[chef]['id'],self.sessions[emp]['id'])),('extension',self.path[:-4]+'.exe')]:
            r=self.upload(chef,bad);self.check('forged '+label+' upload refused',self.denied(r),{'status':r['status']})
        bad=self.path.rsplit('/',1)[0]+'/'+str(uuid.uuid4())+'.png'
        r=self.upload(chef,bad,PNG,'application/pdf');self.check('disallowed declared MIME refused',self.denied(r),{'status':r['status']})
        r=self.upload(chef,bad,b'x'*(10485760+1));self.check('over 10 MiB refused by Storage',self.denied(r),{'status':r['status'],'bytes':10485761})
        mismatch=self.path.rsplit('/',1)[0]+'/'+str(uuid.uuid4())+'.png'
        r=self.upload(chef,mismatch,PNG,'image/jpeg')
        attached=self.validate(chef,mismatch)
        self.check('extension/MIME mismatch never attachable',self.denied(attached),{'uploadStatus':r['status'],'validationStatus':attached['status']})
        spoof=self.path.rsplit('/',1)[0]+'/'+str(uuid.uuid4())+'.png'
        r=self.upload(chef,spoof,b'QA harmless text, not a binary PNG','image/png');v=self.validate(chef,spoof)
        self.report['observations'].append({'name':'MIME metadata is not binary analysis','uploadStatus':r['status'],'attachmentValidationStatus':v['status'],'binaryAnalysisPerformed':False,'risk':'A declared PNG containing non-image bytes may pass metadata validation. No sniffing, image decoding or antivirus.'})
        self.save()
        for label,path,actor in [('public','/storage/v1/object/public/mir-internal/'+self.path,None),('anonymous','/storage/v1/object/authenticated/mir-internal/'+self.path,None),('client','/storage/v1/object/authenticated/mir-internal/'+self.path,'OUTSIDER')]:
            if actor and actor not in self.sessions:continue
            r=self.request('GET',path,actor=actor);self.check('private file HTTP '+label+' refused',self.denied(r),{'status':r['status']})
        r=self.request('GET','/storage/v1/object/authenticated/mir-internal/'+self.path,actor=emp)
        self.check('private file current conversation member accepted',self.ok(r) and r['sha256']==hashlib.sha256(PNG).hexdigest(),{'status':r['status'],'sha256':r['sha256']})
        self.check('short signed URL issued',self.sign(emp,self.path,'short',5)['status']==200,{'ttl':5})
        self.check('300 second client signed URL issued',self.sign(emp,self.path,'client',300)['status']==200,{'ttl':300})
        r=self.signed_check('short');self.check('signed URL works before expiration',r['status']==200,r)
        # Add bounded, tagged real messages; never report unrelated history.
        expected=set();args={'org':ORG,'conversation':self.con,'body':self.tag+' concurrent','job':None,'plan':None,'attachment':None,'request_id':str(uuid.uuid4())}
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(lambda _:self.rpc(chef,'mir_message_send',args),range(8)))
        mid=results[0]['data']['id'];self.concurrentMessage=mid
        self.check('8 concurrent sends idempotent',all(self.ok(r) and r['data']['id']==mid for r in results),{'messageId':mid,'statuses':[r['status'] for r in results]})
        r=self.rpc(chef,'mir_message_ack',{'org':ORG,'message':mid,'state':'read'});self.check('sender cannot ack another recipient',self.denied(r),{'status':r['status']})
        r=self.rpc(emp,'mir_message_ack',{'org':ORG,'message':mid,'state':'read','user_id':self.sessions[chef]['id']});self.check('forged ack user parameter refused',self.denied(r),{'status':r['status']})
        r=self.rpc(emp,'mir_message_ack',{'org':ORG,'message':mid,'state':'read'});self.check('self read receipt accepted',self.ok(r) and r['data'].get('readAt') is not None,{'status':r['status']})
        def page_send(n):return self.send(chef,self.tag+' PAGE '+str(n))
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(page_send,range(57)))
        self.check('57 tagged pagination messages sent',all(self.ok(r) for r in results),{'count':len(results)})
        expected={r['data']['id'] for r in results}
        found=[];cursor=None
        while True:
            r=self.rpc(emp,'mir_chat_messages',{'org':ORG,'conversation':self.con,'page_size':7,'page_before':cursor})
            if not self.ok(r):raise RuntimeError('Message page refused')
            found.extend(m['id'] for m in r['data']['items']);cursor=r['data'].get('nextCursor')
            if not cursor:break
        self.check('real message cursor: no gaps or duplicates',expected.issubset(set(found)) and len(found)==len(set(found)) and len(found)==59,{'count':len(found)})
        r=self.rpc(emp,'mir_chat_messages',{'org':ORG,'conversation':self.con,'page_size':99999,'page_before':None})
        self.check('real server maximum 50',self.ok(r) and len(r['data']['items'])==50,{'count':len(r['data']['items'])})
        found=[];cursor=None
        while True:
            r=self.rpc(emp,'mir_chat_search',{'org':ORG,'query_text':self.tag+' PAGE','page_size':8,'page_before':cursor})
            if not self.ok(r):raise RuntimeError('Search page refused')
            found.extend(m['id'] for m in r['data']['items']);cursor=r['data'].get('nextCursor')
            if not cursor:break
        self.check('real bounded search: no gaps or duplicates',set(found)==expected and len(found)==57,{'count':len(found)})
        # Same-tenant negative conversation, assigned only to Chef; no copied participants.
        restricted=self.assign('[QA PHASE3A] '+self.tag+' restricted',self.sessions[chef]['id'])
        cid=self.rpc(chef,'mir_conversation_job',{'org':ORG,'job':restricted})['data']
        canary=self.tag+' HIDDEN';r=self.send(chef,canary,conversation=cid)
        self.check('restricted conversation fixture',self.ok(r),{'status':r['status']})
        r=self.rpc(emp,'mir_chat_search',{'org':ORG,'query_text':canary,'page_size':20,'page_before':None})
        self.check('unauthorized conversation text not searchable',self.ok(r) and not r['data']['items'],{'status':r['status'],'count':len(r['data']['items'])})
        r=self.rpc(emp,'mir_chat_messages',{'org':ORG,'conversation':cid,'page_size':20,'page_before':None})
        self.check('unassigned job conversation refused',self.denied(r),{'status':r['status']})
        # Fast CI can finish the other checks BEFORE five seconds elapse. Wait
        # until actual expiry + a small clock margin; never count an early 200
        # as an expiry failure or infer expiry just from work performed above.
        time.sleep(max(0,self.links['short']['issued']+7-time.time()))
        r=self.signed_check('short');self.check('signed URL expired at actual HTTP endpoint',r['ageSeconds']>5 and self.denied(r),r)
        self.report['fixtures'].update(concurrentMessageId=mid,attachmentMessageId=self.attachmentMessage,restrictedConversationId=cid)
        self.save()
        return {'passed':self.report['passed'],'failed':self.report['failed'],'missing':self.report['missing'],'fixture':self.report['fixtures']}
    def tenant_b(self):
        names=['MIR_CHAT_TENANT_B_INTERNAL_EMAIL','MIR_CHAT_TENANT_B_INTERNAL_PASSWORD','MIR_CHAT_TENANT_B_CONVERSATION_ID']
        missing=[name for name in names if not os.environ.get(name)]
        self.report['tenantB']={'organizationId':FOREIGN,'status':'blocked','missingSecretNames':missing,'accountsCreated':0,'membershipsChanged':0}
        if missing:self.save();return
        r=self.request('POST','/auth/v1/token?grant_type=password',{'email':os.environ[names[0]],'password':os.environ[names[1]]})
        if not self.ok(r) or not r['data'].get('access_token'):raise RuntimeError('Tenant B existing account authentication unavailable')
        self.sessions['TENANT_B']={'token':r['data']['access_token'],'id':r['data']['user']['id']}
        account=self.rpc('TENANT_B','mir_account_snapshot',{})
        self.check('tenant B actual internal identity',self.ok(account) and account['data'].get('organizationId')==FOREIGN and account['data'].get('role') in ['admin','employee'],{'status':account['status']})
        cid=os.environ[names[2]]
        r=self.rpc('TENANT_B','mir_chat_messages',{'org':FOREIGN,'conversation':cid,'page_size':1,'page_before':None})
        self.check('tenant B authorized existing conversation',self.ok(r),{'status':r['status']})
        marker=self.tag+' B_CANARY'
        r=self.rpc('TENANT_B','mir_message_send',{'org':FOREIGN,'conversation':cid,'body':marker,'job':None,'plan':None,'attachment':None,'request_id':str(uuid.uuid4())})
        self.check('tenant B scoped canary without new membership',self.ok(r),{'status':r['status']})
        for actor,org,c in [('TENANT_B',ORG,self.con),(self.employee,FOREIGN,cid),(self.roles['admin'],FOREIGN,cid)]:
            r=self.rpc(actor,'mir_chat_messages',{'org':org,'conversation':c,'page_size':1,'page_before':None})
            self.check('bidirectional tenant refusal '+actor+' '+org,self.denied(r),{'status':r['status']})
        for actor,org,query in [('TENANT_B',FOREIGN,self.tag+' PAGE'),(self.employee,ORG,marker)]:
            r=self.rpc(actor,'mir_chat_search',{'org':org,'query_text':query,'page_size':50,'page_before':None})
            self.check('other tenant nonempty canary not searchable '+actor,self.ok(r) and not r['data']['items'],{'status':r['status']})
        self.report['tenantB']['status']='passed';self.save()

if __name__=='__main__':
    cert=Certification()
    try:
        cert.authenticate()
        if '--interactive' in sys.argv:
            for line in sys.stdin:
                try:
                    c=json.loads(line);action=c['action']
                    if action=='core':result=cert.core()
                    elif action=='signed':result=cert.signed_check(c['key'])
                    elif action=='rpc':
                        r=cert.rpc(cert.roles.get(c['role'],c['role']),c['name'],c['args'])
                        result=r
                    elif action=='check':cert.check(c['name'],c['condition'],c.get('evidence'));result={'saved':True}
                    elif action=='sign':result=cert.sign(cert.roles[c['role']],c['path'],c['key'],c['ttl'])
                    elif action=='http':result=cert.request(c['method'],c['path'],c.get('body'),cert.roles.get(c.get('role'),c.get('role')))
                    elif action=='summary':result={'roles':list(cert.roles),'fixtures':cert.report['fixtures'],'passed':cert.report['passed'],'failed':cert.report['failed'],'links':{k:{'ttl':v['ttl'],'ageSeconds':round(time.time()-v['issued'])} for k,v in cert.links.items()}}
                    else:raise ValueError('Unknown action')
                    print(json.dumps({'ok':True,'result':result}),flush=True)
                except Exception as e:print(json.dumps({'ok':False,'errorClass':type(e).__name__,'error':str(e) if isinstance(e,AssertionError) else 'Check failed; no credentials logged'}),flush=True)
        else:
            cert.core();cert.tenant_b()
            required=['admin','boss','assistant','chef_equipe','employe']
            if any(r not in cert.roles for r in required):raise RuntimeError('Required role credentials missing')
            cert.report['finishedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());cert.save()
    except Exception as e:
        cert.report['fatal']={'class':type(e).__name__,'message':str(e) if isinstance(e,AssertionError) else 'Certification incomplete; no credentials logged'};cert.save()
        print('Certification incomplete: '+type(e).__name__,file=sys.stderr);sys.exit(1)
