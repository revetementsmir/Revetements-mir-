"""Real Auth/RPC checks with no business writes. No credentials in the report."""
import json,sys,urllib.request,urllib.error,urllib.parse,hashlib
c=json.load(sys.stdin)
url=c['publicConfig']['supabaseUrl'];key=c['publicConfig']['publishableKey']
if url not in ('https://gccltmaulvrnthrbnrpd.supabase.co','https://hxtztkmbfpmzrieccwsg.supabase.co'):
    raise ValueError('Unexpected destination')
def call(endpoint,payload=None,token=None):
    headers={'apikey':key,'Content-Type':'application/json'}
    if token:headers['Authorization']='Bearer '+token
    request=urllib.request.Request(url+endpoint,data=json.dumps(payload).encode() if payload is not None else None,headers=headers)
    try:
        with urllib.request.urlopen(request,timeout=20) as response:
            return response.status,json.load(response)
    except urllib.error.HTTPError as error:
        try:body=json.load(error)
        except Exception:body={}
        return error.code,body
results=[]
for role,account in c['accounts'].items():
    row={'role':role};token=None
    try:
        code,data=call('/auth/v1/token?grant_type=password',account)
        row['loginHttp']=code
        if code!=200:
            row['errorCode']=data.get('error_code',data.get('code'));row['status']='FAIL'
        else:
            token=data['access_token'];code,user=call('/auth/v1/user',token=token)
            row['identityConfirmed']=code==200 and user.get('id')==data['user']['id']
            code,memberships=call('/rest/v1/rpc/mir_my_memberships',{},token)
            expected='client' if role in ('other_client','outsider') else role
            memberships=memberships if code==200 else []
            row['membershipsConfirmed']=bool(memberships) and all(m['role']==expected for m in memberships)
            row['organizations']=[]
            for membership in memberships:
                org=membership['id'];code,snapshot=call('/rest/v1/rpc/mir_shared_snapshot',{'org':org},token)
                result={'organizationId':org,'role':membership['role'],'snapshotHttp':code}
                if code==200:
                    result.update(catalogueCount=len(snapshot['catalogue']),orderCount=len(snapshot['orders']),snapshotSha256=hashlib.sha256(json.dumps(snapshot,sort_keys=True).encode()).hexdigest(),publicationRules=bool(snapshot.get('capabilities',{}).get('publicationRules')))
                    result['roleMatches']=snapshot['role']==expected
                    result['privateMembersHidden']=expected=='admin' or snapshot.get('members')==[]
                if expected in ('employee','client'):
                    denied,body=call('/rest/v1/rpc/mir_admin_publish_model',{'org':org,'model':'00000000-0000-4000-8000-000000000000','expected_revision':0,'settings':{}},token)
                    result['adminWriteDenied']=denied==403 and body.get('code')=='42501'
                denied,body=call('/rest/v1/rpc/mir_shared_snapshot',{'org':org})
                result['anonymousDenied']=denied in (401,403) and body.get('code')=='42501'
                row['organizations'].append(result)
            row['status']='PASS' if row['identityConfirmed'] and row['membershipsConfirmed'] and all(o['snapshotHttp']==200 and o['roleMatches'] and o['privateMembersHidden'] and o.get('adminWriteDenied',True) and o['anonymousDenied'] for o in row['organizations']) else 'FAIL'
    except Exception as error:
        row.update(status='FAIL',errorType=type(error).__name__)
    finally:
        if token:
            request=urllib.request.Request(url+'/auth/v1/logout?scope=local',data=b'',headers={'apikey':key,'Authorization':'Bearer '+token},method='POST')
            try:
                with urllib.request.urlopen(request,timeout=15) as response:row['signedOut']=response.status==204
            except Exception:row['signedOut']=False
    results.append(row)
print(json.dumps({'mode':'read-only-business-data','projectUrl':url,'results':results},indent=2))
