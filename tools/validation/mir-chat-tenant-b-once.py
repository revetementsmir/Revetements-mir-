"""Invoke the TEST-only one-time recipe without logging credentials or Auth responses."""
import os,json,urllib.request,urllib.error
HOST='https://hxtztkmbfpmzrieccwsg.supabase.co'
key=os.environ['MIR_SANDBOX_PUBLISHABLE_KEY']
def call(path,body,token=None):
 headers={'apikey':key,'content-type':'application/json'}
 if token:headers['authorization']='Bearer '+token
 try:r=urllib.request.urlopen(urllib.request.Request(HOST+path,data=json.dumps(body).encode(),headers=headers,method='POST'),timeout=180)
 except urllib.error.HTTPError as e:r=e
 raw=r.read()
 try:data=json.loads(raw)
 except Exception:data={}
 return r.status,data
status,auth=call('/auth/v1/token?grant_type=password',{'email':os.environ['MIR_SANDBOX_ADMIN_EMAIL'],'password':os.environ['MIR_SANDBOX_ADMIN_PASSWORD']})
if status!=200 or not auth.get('access_token'):raise SystemExit('Tenant-B recipe: admin authentication failed')
token=auth['access_token'];auth.clear()
status,result=call('/functions/v1/mir-chat-tenant-b-recipe',{},token)
token=None
safe={k:result.get(k) for k in ('status','passed','failed','provisioned','clientBUntouched','production')}
print(json.dumps(safe,sort_keys=True))
if status!=200 or result.get('failed')!=0 or result.get('passed',0)<8:raise SystemExit('Tenant-B recipe incomplete')
