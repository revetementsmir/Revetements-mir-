'use strict';
// Explicit MIR TEST integration check. No mail, production writes or role changes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
if(!process.env.MIR_SANDBOX_EMPLOYEE_PASSWORD){console.log('SKIP real staff API check: MIR TEST credentials not configured');process.exit(0);}
const {api,employee}=require('../tools/validation/mir-estimate-edge-real.cjs'),allowed=process.argv.includes('--allowed'),refused=process.argv.includes('--refused');
assert.ok(allowed!==refused,'Choose --allowed or --refused; grant/revoke is a separate authorized admin action');
const dir=path.resolve(__dirname,'../docs/verification/estimation-edge-20261109'),file=path.join(dir,'real-staff-access.json'),report=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{project:'MIR TEST',account:'QA employee explicitly authorized temporarily; not the actual adjointe',emailSent:false,checks:[]};
const records=JSON.parse(fs.readFileSync(path.join(dir,'real-api.json'))).requests;
for(const {source,id}of records){const result=api('/'+id,{token:employee});assert.equal(result.status,allowed?200:403);if(allowed){assert.equal(result.data.payload.source,source);for(const f of result.data.files.filter(f=>f.field==='dossier'||source==='studio'&&f.id==='1')){const pdf=api('/'+id+'/files/'+f.id,{token:employee});assert.equal(pdf.status,200);assert.equal(pdf.bytes.length,f.bytes);assert.equal(createHash('sha256').update(pdf.bytes).digest('hex'),f.sha256);}}
if(source==='studio')assert.equal(api('/'+id+'/studio',{token:employee}).status,allowed?200:403);
if(refused)assert.equal(api('/'+id+'/files/1',{token:employee}).status,403);
report.checks.push({source,phase:allowed?'temporarily allowlisted':'access removed',recordStatus:result.status,pdfHashesVerified:allowed&&result.data.files.length>0,passed:true});}
report[allowed?'allowedAt':'revokedAt']=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(report,null,2));console.log('PASS real MIR TEST staff '+(allowed?'authorized record/PDF/Studio access':'access refused after removal'));
