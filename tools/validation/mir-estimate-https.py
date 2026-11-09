"""Optional test transport for managed proxy CAs. Real HTTPS only; no fixtures.
Credentials enter on stdin; neither requests nor responses are logged.
"""
import base64,json,sys,urllib.request,urllib.error
try:
    request=json.load(sys.stdin)
    if urllib.parse.urlparse(request['url']).hostname not in ('gccltmaulvrnthrbnrpd.supabase.co','hxtztkmbfpmzrieccwsg.supabase.co'):
        raise ValueError('Unexpected destination')
    if not request['url'].startswith('https://'):
        raise ValueError('HTTPS required')
    headers={k:v for k,v in request['headers'].items() if k.lower() not in ('host','content-length','connection','accept-encoding')}
    body=base64.b64decode(request['body']) if request.get('body') else None
    req=urllib.request.Request(request['url'],data=body,headers=headers,method=request['method'])
    try:
        response=urllib.request.urlopen(req,timeout=90)
    except urllib.error.HTTPError as error:
        response=error
    with response:
        body=response.read(25*1024*1024+1)
        if len(body)>25*1024*1024:
            raise ValueError('Response too large')
        result={'status':response.status,'headers':dict(response.headers.items()),'body':base64.b64encode(body).decode()}
    print(json.dumps(result))
except Exception as exc:
    print(json.dumps({'transportError':'Verified HTTPS relay unavailable','exceptionType':type(exc).__name__,'reasonType':type(getattr(exc,'reason',None)).__name__,'reason':str(getattr(exc,'reason',''))[:160] if isinstance(getattr(exc,'reason',None),(str,OSError)) else ''}))
    sys.exit(1)
