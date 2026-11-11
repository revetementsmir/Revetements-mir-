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
    def certify(self):
        self.report['kind']='real-MIR-TEST-gateway';self.report['operatorRevocation']='not-run: requires scoped TEST operator and post-removal HTTP proof';self.authenticate()
        actor=self.roles.get('employe')
        if not actor:raise RuntimeError('Existing employee account missing')
        availability=self.gateway(actor,'download',path='%2e%2e')
        if availability['status']!=400:
            self.report['status']='BLOCKED_GATEWAY_NOT_READY';self.report['availabilityStatus']=availability['status'];self.save();return 2
        self.setup();chef=self.chef;emp=self.employee
        r=self.gateway(chef,'upload',mime='image/png',base64=base64.b64encode(existing.PNG).decode())
        self.check('gateway real valid binary PNG upload',self.ok(r),{'status':r['status']})
        self.path=r['data']['path'];self.report['fixtures']['validObjectPath']=self.path
        self.check('gateway canonical server path',self.path.startswith(f'{existing.ORG}/message/{self.con}/{self.sessions[chef]["id"]}/'))
        for role,key in self.roles.items():
            r=self.gateway(key,'download',path=self.path)
            self.check('gateway real read '+role,r['status']==403 if role=='warehouse' else r['status']==200,{'status':r['status']})
            if r['status']==200:
                self.check('real noncacheable headers '+role,all('no-store' in (r['headers'].get(k) or '') for k in ['cache-control','cdn-cache-control','cloudflare-cdn-cache-control','surrogate-control']),{'headers':r['headers']})
        # Native Storage/signing must be closed only after the separately authorized activation.
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
        self.tenant_b()
        self.report['status']='PARTIAL_OPERATOR_REVOCATION_PENDING' if self.report['tenantB']['status']=='passed' else 'BLOCKED_TENANT_B_ACCESS'
        self.save();return 2 # Intentionally not a full certification without operator/cache evidence.

if __name__=='__main__':
    cert=GatewayCertification()
    try:code=cert.certify()
    except Exception as e:
        cert.report['status']='FAILED';cert.report['failureClass']=type(e).__name__;cert.save();code=1
    print(json.dumps({'status':cert.report.get('status'),'passed':cert.report.get('passed',0),'failed':cert.report.get('failed',0)}));sys.exit(code)
