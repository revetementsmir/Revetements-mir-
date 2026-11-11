"""Future gateway certification: TEST pinned, no accounts/memberships changed.
Fails BLOCKED before QA writes if the explicitly authorized gateway is absent.
This is not deployed automatically by any workflow.
"""
import importlib.util, pathlib, sys, os, json, base64, hashlib, uuid, concurrent.futures
source=pathlib.Path(__file__).with_name('mir-chat-phase3a-real.py')
spec=importlib.util.spec_from_file_location('mir_chat_existing_certification',source)
existing=importlib.util.module_from_spec(spec);spec.loader.exec_module(existing)

class GatewayCertification(existing.Certification):
    def gateway(self,actor,action,**extra):
        return self.request('POST','/functions/v1/mir-chat-files',{'org':existing.ORG,'conversation':getattr(self,'con',str(uuid.uuid4())),'action':action,**extra},actor)
    def assignments(self,member):
        r=self.rpc(self.roles['admin'],'mir_portal_snapshot',{})
        if not self.ok(r):raise RuntimeError('Assignment snapshot unavailable')
        return {j['id'] for j in r['data']['jobs'] if member in j.get('assignedMemberIds',[])}
    def replace_assignments(self,member,job_ids):
        return self.rpc(self.roles['admin'],'mir_portal_command',{'p_request_id':str(uuid.uuid4()),'p_command':'ASSIGN_MEMBER_JOBS','p_payload':{'memberId':member,'jobIds':sorted(job_ids)}})
    def restore_qa_assignment(self,member):
        # Remove only this run's tagged job. Preserve any assignment added by
        # another operator while the short revocation test was running.
        current=self.assignments(member)
        r=self.replace_assignments(member,current-{self.job})
        self.check('temporary QA assignment restored '+member[-8:],self.ok(r) and self.job not in self.assignments(member),{'status':r['status']})
    def renew_actor(self,actor):
        email=os.environ.get('MIR_SANDBOX_'+actor+'_EMAIL');password=os.environ.get('MIR_SANDBOX_'+actor+'_PASSWORD')
        r=self.request('POST','/auth/v1/token?grant_type=password',{'email':email,'password':password})
        if not self.ok(r) or r['data']['user']['id']!=self.sessions[actor]['id']:raise RuntimeError('Session renewal failed')
        self.sessions[actor]['token']=r['data']['access_token'];return r
    def certify(self):
        self.report['kind']='real-MIR-TEST-gateway';self.report['operatorRevocation']='pending';self.authenticate()
        actor=self.roles.get('employe')
        if not actor:raise RuntimeError('Existing employee account missing')
        availability=self.gateway(actor,'download',path='%2e%2e')
        if availability['status']!=400:
            self.report['status']='BLOCKED_GATEWAY_NOT_READY';self.report['availabilityStatus']=availability['status'];self.save();return 2
        self.setup();chef=self.chef;emp=self.employee
        emp_id=self.sessions[emp]['id'];chef_id=self.sessions[chef]['id']
        try:
            r=self.gateway(chef,'upload',mime='image/png',base64=base64.b64encode(existing.PNG).decode())
            self.check('gateway real valid binary PNG upload',self.ok(r),{'status':r['status']})
            self.path=r['data']['path'];self.report['fixtures']['validObjectPath']=self.path
            self.check('gateway canonical server path',self.path.startswith(f'{existing.ORG}/message/{self.con}/{chef_id}/'))
            for role,key in self.roles.items():
                r=self.gateway(key,'download',path=self.path)
                self.check('gateway real read '+role,r['status']==403 if role=='warehouse' else r['status']==200,{'status':r['status']})
                if r['status']==200:
                    required=['cache-control','cdn-cache-control','surrogate-control']
                    uncached=all('no-store' in (r['headers'].get(k) or '') for k in required) and r['headers'].get('cf-cache-status') in ('DYNAMIC','BYPASS')
                    self.check('real noncacheable headers '+role,uncached,{'headers':r['headers'],'edgeStrippedHeader':'cloudflare-cdn-cache-control'})
            before=self.assignments(emp_id);self.check('QA job present before withdrawal',self.job in before)
            r=self.replace_assignments(emp_id,before-{self.job});self.check('scoped employee withdrawal applied',self.ok(r),{'status':r['status']})
            r=self.gateway(emp,'download',path=self.path);self.check('new gateway read refused after withdrawal',r['status']==403,{'status':r['status']})
            r=self.replace_assignments(emp_id,before);self.check('scoped employee reintegration applied',self.ok(r),{'status':r['status']})
            r=self.gateway(emp,'download',path=self.path);self.check('new gateway read allowed after reintegration',self.ok(r) and r['sha256']==hashlib.sha256(existing.PNG).hexdigest(),{'status':r['status']})
            self.report['operatorRevocation']='passed: tagged-job withdrawal/reintegration; no claim about copies already downloaded'
            r=self.request('GET','/storage/v1/object/authenticated/mir-internal/'+self.path,actor=emp)
            self.check('native Storage read closed',self.denied(r),{'status':r['status']})
            r=self.request('POST','/storage/v1/object/sign/mir-internal/'+self.path,{'expiresIn':300},emp)
            self.check('new native signed link refused',self.denied(r),{'status':r['status']})
            for label,body in [('text declared PNG',b'not a PNG'),('invalid CRC',existing.PNG[:-1]+bytes([existing.PNG[-1]^1]))]:
                r=self.gateway(chef,'upload',mime='image/png',base64=base64.b64encode(body).decode())
                self.check(label+' refused by binary inspection',r['status']==422,{'status':r['status']})
            for path in ['%2e%2e','%252e%252e',self.path+'/%2f',self.path+'/../x']:
                r=self.gateway(emp,'download',path=path);self.check('encoded path controlled 4xx',r['status']==400,{'status':r['status']})
            r=self.gateway(emp,'download',org=existing.FOREIGN,path=self.path.replace(existing.ORG,existing.FOREIGN))
            self.check('gateway foreign tenant refused',r['status']==403,{'status':r['status']})
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:reads=list(pool.map(lambda _:self.gateway(emp,'download',path=self.path),range(8)))
            self.check('eight concurrent reauthorized binary reads',all(self.ok(r) and r['sha256']==hashlib.sha256(existing.PNG).hexdigest() for r in reads))
            # Real Auth session transition: logout the test login, require the
            # old bearer to stop opening the gateway, then create a fresh login.
            old=self.sessions[emp]['token'];logout=self.request('POST','/auth/v1/logout?scope=local',{},emp)
            self.check('TEST local logout accepted',logout['status'] in (200,204),{'status':logout['status']})
            stale=self.gateway(emp,'download',path=self.path)
            self.check('logged-out session cannot start a new gateway read',stale['status']==401,{'status':stale['status']})
            self.renew_actor(emp);fresh=self.gateway(emp,'download',path=self.path)
            self.check('fresh session can read after session change',self.ok(fresh),{'status':fresh['status'],'oldTokenReused':False})
            self.report['sessionTransition']={'logoutStatus':logout['status'],'oldBearerStatus':stale['status'],'freshBearerStatus':fresh['status'],'clientLateResponseGuard':'covered by tests/mir-chat-phase3a.cjs'}
            self.tenant_b()
            self.report['status']='PARTIALLY_VALIDATED' if self.report['tenantB']['status']!='passed' else 'CERTIFIED'
            self.save();return 2 if self.report['tenantB']['status']!='passed' else 0
        finally:
            # Remove only this run's tagged job; preserve any concurrent new assignment.
            for member in (emp_id,chef_id):
                try:self.restore_qa_assignment(member)
                except Exception as e:
                    self.report.setdefault('restoreFailures',[]).append({'memberSuffix':member[-8:],'class':type(e).__name__});self.save()

if __name__=='__main__':
    cert=GatewayCertification()
    try:code=cert.certify()
    except Exception as e:
        cert.report['status']='FAILED';cert.report['failureClass']=type(e).__name__;cert.save();code=1
    print(json.dumps({'status':cert.report.get('status'),'passed':cert.report.get('passed',0),'failed':cert.report.get('failed',0)}));sys.exit(code)
