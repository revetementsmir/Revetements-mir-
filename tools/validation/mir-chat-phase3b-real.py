"""Targeted Phase 3B PDF integration on MIR TEST; no migrations or deployment."""
import base64, hashlib, json, os, pathlib, sys, time, uuid
import importlib.util

root=pathlib.Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('gateway3a',root/'tools/validation/mir-chat-files-real.py')
gateway3a=importlib.util.module_from_spec(spec);spec.loader.exec_module(gateway3a)
spec_pdf=importlib.util.spec_from_file_location('not_used',root/'tools/validation/mir-chat-phase3a-real.py')

def make_pdf():
    parts=[b'%PDF-1.4\n'];offsets=[]
    for obj in [b'1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',b'2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',b'3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 72 72] >>\nendobj\n']:
        offsets.append(sum(map(len,parts)));parts.append(obj)
    xref=sum(map(len,parts));parts.append(b'xref\n0 4\n0000000000 65535 f \n')
    parts.extend((f'{offset:010d} 00000 n \n'.encode() for offset in offsets))
    parts.append(f'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode())
    return b''.join(parts)

class Phase3B(gateway3a.GatewayCertification):
    def certify(self):
        self.report['kind']='real-MIR-TEST-phase3b-pdf';self.report['scope']='targeted PDF/photo gateway and messaging regressions';self.authenticate()
        actor=self.roles.get('employe')
        if not actor:raise RuntimeError('Existing employee account missing')
        if self.gateway(actor,'download',path='%2e%2e')['status']!=400:raise RuntimeError('Gateway PDF version not ready')
        self.setup();emp=self.employee;chef=self.chef;pdf=make_pdf();emp_id=self.sessions[emp]['id'];chef_id=self.sessions[chef]['id']
        try:
            uploaded={}
            r=self.gateway(chef,'upload',mime='image/png',base64=base64.b64encode(gateway3a.existing.PNG).decode())
            self.check('real photo gateway upload',self.ok(r) and r['data']['mime']=='image/png',{'status':r['status'],'size':len(gateway3a.existing.PNG),'inspector':r['data'].get('inspector') if self.ok(r) else None});uploaded['photo']=r['data']['path']
            read=self.gateway(emp,'download',path=uploaded['photo']);self.check('real photo gateway read',self.ok(read) and read['sha256']==hashlib.sha256(gateway3a.existing.PNG).hexdigest(),{'status':read['status']})
            photo=self.send(chef,self.tag+' PHOTO',uploaded['photo']);self.check('photo message regression',self.ok(photo),{'status':photo['status']})
            r=self.gateway(chef,'upload',mime='application/pdf',base64=base64.b64encode(pdf).decode())
            self.check('real pdf gateway upload',self.ok(r) and r['data']['mime']=='application/pdf',{'status':r['status'],'size':len(pdf),'inspector':r['data'].get('inspector') if self.ok(r) else None});uploaded['pdf']=r['data']['path']
            read=self.gateway(emp,'download',path=uploaded['pdf']);self.check('real pdf gateway read',self.ok(read) and read['sha256']==hashlib.sha256(pdf).hexdigest(),{'status':read['status']})
            invalid=[b'not a PDF',pdf[:-8],pdf.replace(b'/Type /Catalog',b'/Type /Catalog /JavaScript')]
            for index,raw in enumerate(invalid):
                r=self.gateway(chef,'upload',mime='application/pdf',base64=base64.b64encode(raw).decode())
                self.check('invalid PDF refused '+str(index+1),r['status']==422,{'status':r['status']})
            request_id=str(uuid.uuid4())
            first=self.send(chef,self.tag+' PDF',uploaded['pdf'],request_id=request_id);second=self.send(chef,self.tag+' PDF',uploaded['pdf'],request_id=request_id)
            self.check('PDF message send idempotent',self.ok(first) and self.ok(second) and first['data']['id']==second['data']['id'],{'statuses':[first['status'],second['status']]})
            page=self.rpc(emp,'mir_chat_messages',{'org':gateway3a.existing.ORG,'conversation':self.con,'page_size':1,'page_before':None})
            self.check('real pagination still bounded',self.ok(page) and len(page['data']['items'])==1 and page['data'].get('nextCursor') is not None,{'status':page['status']})
            search=self.rpc(emp,'mir_chat_search',{'org':gateway3a.existing.ORG,'query_text':self.tag,'page_size':20,'page_before':None})
            ids={m['id'] for m in search['data']['items']} if self.ok(search) else set()
            self.check('real search returns tagged photo and PDF',self.ok(search) and first['data']['id'] in ids and photo['data']['id'] in ids,{'status':search['status'],'count':len(ids)})
            ack=self.rpc(emp,'mir_message_ack',{'org':gateway3a.existing.ORG,'message':first['data']['id'],'state':'read'})
            self.check('real PDF unread receipt',self.ok(ack) and ack['data'].get('readAt') is not None,{'status':ack['status']})
            before=self.assignments(emp_id);self.check('QA assignment present before PDF withdrawal',self.job in before)
            changed=self.replace_assignments(emp_id,before-{self.job});self.check('PDF withdrawal applied',self.ok(changed),{'status':changed['status']})
            for label in ('photo','pdf'):
                denied=self.gateway(emp,'download',path=uploaded[label]);self.check(label+' new read refused after withdrawal',denied['status']==403,{'status':denied['status']})
            restored=self.replace_assignments(emp_id,before);self.check('PDF reintegration applied',self.ok(restored),{'status':restored['status']})
            allowed=self.gateway(emp,'download',path=uploaded['pdf']);self.check('PDF read restored after reintegration',self.ok(allowed),{'status':allowed['status']})
            direct=self.request('GET','/storage/v1/object/authenticated/mir-internal/'+uploaded['pdf'],actor=emp)
            self.check('PDF direct Storage remains refused',self.denied(direct),{'status':direct['status']})
            self.report['fixtures'].update(pdfPath=uploaded['pdf'],photoPath=uploaded['photo'],pdfMessageId=first['data']['id'])
            self.report['status']='TARGETED_TEST_PASSED';self.report['finishedAt']=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());self.save();return 0
        finally:
            for member in (emp_id,chef_id):
                try:self.restore_qa_assignment(member)
                except Exception as error:self.report.setdefault('restoreFailures',[]).append({'memberSuffix':member[-8:],'class':type(error).__name__});self.save()

if __name__=='__main__':
    cert=Phase3B()
    try:code=cert.certify()
    except Exception as error:
        cert.report['status']='FAILED';cert.report['failureClass']=type(error).__name__;cert.save();code=1
    print(json.dumps({'status':cert.report.get('status'),'passed':cert.report.get('passed',0),'failed':cert.report.get('failed',0)}));sys.exit(code)
