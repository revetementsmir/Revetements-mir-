const AuthFlow=require('./auth-flow.cjs');
const {Native,Policy}=window.MIRAndroid||{};
if(!Native||!window.MIRSupabase)throw Error('Initialisation Android manquante');
const raw=window.MIRSupabase,allowedRoles=new Set(['employee','employe','chef','chef_equipe','warehouse','assistant','boss']);
let client=null,identity=null,identityToken=null,sessionEpoch=0;
const capabilities=window.MIRTeamTestConfig||{};
// TEST diagnostics contain only operation names/stages, never Auth arguments.
const diagnosticContext=Math.random().toString(36).slice(2),nativePending=new Map(),authPending=new Map();let diagnosticSequence=0,activeDiagnostic=null;
function nativeCall(name,args){const id=++diagnosticSequence;nativePending.set(id,{id,method:name,...(['session','pkce','pending'].includes(args?.slot)?{slot:args.slot}:{}),startedAt:Date.now()});let result;try{result=Native[name](args);}catch(error){nativePending.delete(id);throw error;}Promise.resolve(result).then(()=>nativePending.delete(id),()=>nativePending.delete(id));return result;}
function authStage(phase){if(activeDiagnostic)activeDiagnostic.phase=phase;}
function diagnosticSnapshot(){return{context:diagnosticContext,path:typeof location==='object'?location.pathname||'': '',top:!window.parent||window.parent===window,clientCreated:!!client,active:activeDiagnostic?{...activeDiagnostic}:null,queued:[...authPending.values()].map(value=>({...value})),native:[...nativePending.values()].map(value=>({...value}))};}
const diagnosticPeers=new Map(),diagnosticChannel=typeof BroadcastChannel==='function'?new BroadcastChannel('mir-android-auth-diagnostic'):null;
const diagnosticPhases=new Set(['operation','local-queue','shared-lock','browser-clear','indexeddb-list','indexeddb-delete','browser-purged','sdk-sign-out','native-clear','native-read-after-clear','browser-purge','cleared','sdk-sign-in','invitation-check','account-check','signed-in','event-guard','event-native-read','event-browser-purge']),diagnosticMethods=new Set(['authLockStatus','unlockAuth','readAuth','writeAuth','removeAuthSlot','clearAuth','openAuth']),diagnosticPaths=new Set(['/chantier.html','/production.html','/entrepot.html','/coordination.html','/native-checks.html','/native-pdf.html','/index.html','/calepinage.html','/espace-partage.html']);
function safeDiagnosticState(state){const entry=value=>({id:Number(value?.id)||0,phase:diagnosticPhases.has(value?.phase)?value.phase:'unknown',startedAt:Number(value?.startedAt)||0}),native=value=>({id:Number(value?.id)||0,method:diagnosticMethods.has(value?.method)?value.method:'unknown',...(['session','pkce','pending'].includes(value?.slot)?{slot:value.slot}:{}),startedAt:Number(value?.startedAt)||0});return{context:state.context,path:diagnosticPaths.has(state.path)?state.path:'',top:state.top===true,clientCreated:state.clientCreated===true,active:state.active?entry(state.active):null,queued:Array.isArray(state.queued)?state.queued.slice(0,32).map(entry):[],native:Array.isArray(state.native)?state.native.slice(0,32).map(native):[]};}
if(diagnosticChannel)diagnosticChannel.onmessage=({data})=>{if(data?.type==='query')diagnosticChannel.postMessage({type:'state',state:diagnosticSnapshot()});else if(data?.type==='state'&&/^[a-z0-9]{1,32}$/.test(data.state?.context||'')){diagnosticPeers.set(data.state.context,safeDiagnosticState(data.state));if(diagnosticPeers.size>16)diagnosticPeers.delete(diagnosticPeers.keys().next().value);}};
async function purgeBrowser(){
 authStage('browser-clear');
 for(const dialog of window.document?.querySelectorAll('dialog[data-mir-native-file]')||[]){dialog.close();dialog.remove();}
 localStorage.clear();sessionStorage.clear();
 authStage('indexeddb-list');
 if(indexedDB.databases)for(const db of await indexedDB.databases()){authStage('indexeddb-delete');await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(db.name);request.onsuccess=resolve;request.onerror=request.onblocked=()=>reject(Error('Fermez MIR avant de changer de compte : des données privées sont encore ouvertes.'));});}
 authStage('browser-purged');
}
const storageKey='mir_android_test_auth';
let nativeSessionRemovals=0;
const legacyStorage={getItem:async key=>{if(key!==storageKey)return null;if(Native.authLockStatus){const lock=await nativeCall('authLockStatus');if(lock.locked)await (window.MIRAndroidUnlock?window.MIRAndroidUnlock():nativeCall('unlockAuth'));}const result=await nativeCall('readAuth');return result.value||null;},setItem:async(key,value)=>{if(key!==storageKey)throw Error('Cette méthode de connexion n’est pas disponible dans MIR TEST.');return nativeCall('writeAuth',{value});},removeItem:async key=>{if(key===storageKey){nativeSessionRemovals++;await nativeCall('clearAuth');}}};
// PKCE verifier has its own encrypted slot and never replaces the Auth session.
const verifierKey=storageKey+'-code-verifier';
const pkceKey=key=>key===verifierKey||key===storageKey+'-flows-code-verifier'||new RegExp('^'+storageKey+'-flow-[a-f0-9]{32}-code-verifier$').test(key);
let pkceQueue=Promise.resolve();
function pkceTask(operation){const task=pkceQueue.then(operation);pkceQueue=task.catch(()=>{});return task;}
async function pkceValues(){const value=(await nativeCall('readAuth',{slot:'pkce'})).value;if(!value)return {};const parsed=JSON.parse(value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Connexion locale à recommencer.');return parsed;}
const storage={
 getItem:async key=>pkceKey(key)?pkceTask(async()=> (await pkceValues())[key]||null):legacyStorage.getItem(key),
 setItem:async(key,value)=>pkceKey(key)?pkceTask(async()=>{const values=await pkceValues();values[key]=value;await nativeCall('writeAuth',{slot:'pkce',value:JSON.stringify(values)});}):legacyStorage.setItem(key,value),
 removeItem:async key=>pkceKey(key)?pkceTask(async()=>{const values=await pkceValues();delete values[key];if(Object.keys(values).length)await nativeCall('writeAuth',{slot:'pkce',value:JSON.stringify(values)});else await nativeCall('removeAuthSlot',{slot:'pkce'});}):legacyStorage.removeItem(key)
};
window.MIRSupabase=Object.freeze({createClient(url,key,options={}){
 if(url!=='https://'+Policy.TEST||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))throw Error('Projet MIR TEST obligatoire');
 if(client)return client;
 const sharedLocks=globalThis.navigator?.locks||window.navigator?.locks;
 if(typeof sharedLocks?.request!=='function'){const error=Error('Mettez à jour Android System WebView pour sécuriser la connexion MIR.');error.code='ANDROID_AUTH_LOCK_UNAVAILABLE';throw error;}
 client=raw.createClient(url,key,{...options,auth:{...options.auth,storage,storageKey,detectSessionInUrl:false,persistSession:true,flowType:'pkce'}});
 const rpc=client.rpc.bind(client);
 const forbidden=()=>({data:null,error:{code:'42501',message:'Accès réservé aux comptes équipe MIR autorisés. Aucun rôle Admin ou client dans cette application.'}});
 client.rpc=async(name,args,...rest)=>{
  if(capabilities.teamInvitationsEnabled===true&&name==='mir_team_accept_invitation'&&/^[A-Za-z0-9_-]{43}$/.test(args?.p_token||''))return rpc(name,args,...rest);
  const epoch=sessionEpoch,initial=await getSession();
  if(initial.error)return{data:null,error:initial.error};
  const request={epoch,id:initial.data?.session?.user?.id,token:initial.data?.session?.access_token};
  const current=()=>!!request.id&&!!request.token&&request.epoch===sessionEpoch&&request.id===identity&&request.token===identityToken;
  const stillStored=async()=>{if(!current())return false;const saved=await getSession();return current()&&!saved.error&&saved.data?.session?.user?.id===request.id&&saved.data?.session?.access_token===request.token;};
  // Epoch alone is local to one WebView. A destroyed Activity may still receive
  // an old refusal after its replacement has stored a different native session.
  if(!current())return changedRead();
  const account=await rpc('mir_account_snapshot');
  if(!await stillStored())return changedRead();
  const denied=account.error&&(account.error.code==='42501'||[401,403].includes(account.error.status)),roleDenied=!account.error&&!allowedRoles.has(account.data?.role);
  if(denied||roleDenied){
   // Recheck inside the mutation queue: a login may have completed while this
   // refusal waited behind another Auth operation. Never queue an unbound out.
   const cleared=await mutateAuth(async()=>{if(!await stillStored())return false;sessionEpoch++;await clearSession();return true;});
   if(!cleared)return changedRead();
   return roleDenied?forbidden():account;
  }
  if(account.error)return account;
  return name==='mir_account_snapshot'?account:rpc(name,args,...rest);
 };
 const signIn=client.auth.signInWithPassword.bind(client.auth),signOut=client.auth.signOut.bind(client.auth),getSession=client.auth.getSession?.bind(client.auth),setSession=client.auth.setSession?.bind(client.auth);
 // A completed old native clear must never overtake a newer session write.
 let authMutations=Promise.resolve(),ownsAuthMutation=false;
 // Same origin, shared across Activity/WebView instances. This name is separate
 // from the vendor SDK's storage lock; callbacks never acquire it recursively.
 function mutateAuth(operation){const entry={id:++diagnosticSequence,phase:'local-queue',startedAt:Date.now()};authPending.set(entry.id,entry);const result=authMutations.then(()=>{entry.phase='shared-lock';return sharedLocks.request('mir-android-auth-transition',{mode:'exclusive'},async()=>{ownsAuthMutation=true;activeDiagnostic=entry;entry.phase='operation';try{return await operation();}finally{ownsAuthMutation=false;activeDiagnostic=null;}});});authMutations=result.catch(()=>{});result.then(()=>authPending.delete(entry.id),()=>authPending.delete(entry.id));return result;}
 async function clearSession(){const before=nativeSessionRemovals;authStage('sdk-sign-out');try{return await signOut({scope:'local'});}finally{identity=null;identityToken=null;if(nativeSessionRemovals===before){authStage('native-clear');await nativeCall('clearAuth');}authStage('native-read-after-clear');const saved=await nativeCall('readAuth');if(!saved.value){authStage('browser-purge');await purgeBrowser();}authStage('cleared');}}
 client.auth.signInWithPassword=credentials=>{sessionEpoch++;return mutateAuth(async()=>{await clearSession();authStage('sdk-sign-in');const result=await signIn(credentials);if(result.error)return result;if(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(credentials.options?.mirInvitation||'')){authStage('invitation-check');const accepted=await rpc('mir_team_accept_invitation',{p_token:credentials.options.mirInvitation});if(accepted.error){await clearSession();return accepted;}}authStage('account-check');const account=await rpc('mir_account_snapshot');if(account.error||!allowedRoles.has(account.data?.role)){await clearSession();return forbidden();}authStage('signed-in');return result;});};
 client.auth.signOut=()=>{sessionEpoch++;return mutateAuth(clearSession);};
 if(setSession)client.auth.setSession=session=>{sessionEpoch++;return mutateAuth(()=>setSession(session));};
 // getUser(jwt) in the bundled SDK can remove its own session on session_not_found.
 // Validate through a private non-persistent SDK instance, never the active vault.
 let userVerifier=null;
 const changedRead=()=>({data:{user:null},error:{name:'AuthSessionChangedError',code:'SESSION_CHANGED',status:0,message:'La session a changé. Recommencez la lecture.'}});
 const missingSession=()=>({data:{user:null},error:{name:'AuthSessionMissingError',status:400,message:'Session absente.'}});
 client.auth.getUser=async jwt=>{
  if(!getSession)throw Error('Lecture de session native indisponible.');
  const initial=await getSession();if(initial.error)return{data:{user:null},error:initial.error};
  const session=initial.data?.session,token=jwt||session?.access_token;
  if(!token)return missingSession();
  const request={epoch:sessionEpoch,id:session?.user?.id||null,token};
  const current=()=>request.epoch===sessionEpoch&&request.id===identity&&request.token===identityToken;
  if(!current())return changedRead();
  const stillStored=async()=>{if(!current())return false;const saved=await getSession();return current()&&!saved.error&&saved.data?.session?.access_token===request.token&&saved.data?.session?.user?.id===request.id;};
  if(!userVerifier)userVerifier=raw.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,storageKey:storageKey+'-user-validation'}});
  let result=await userVerifier.auth.getUser(request.token);
  if(!await stillStored())return changedRead();
  if(!result.error&&result.data?.user?.id!==request.id)result={data:{user:null},error:{name:'AuthIdentityMismatchError',code:'IDENTITY_MISMATCH',status:403,message:'Identité de session incohérente.'}};
  if(result.error&&([401,403].includes(result.error.status)||result.error.name==='AuthSessionMissingError')){
   const cleanup=await mutateAuth(async()=>{if(!await stillStored())return null;sessionEpoch++;await clearSession();return sessionEpoch;});
   if(cleanup===null||cleanup!==sessionEpoch)return changedRead();
  }
  return result;
 };
 const oauth=client.auth.signInWithOAuth?.bind(client.auth),reset=client.auth.resetPasswordForEmail?.bind(client.auth);
 for(const method of ['signUp','signInWithOAuth','signInWithOtp','resetPasswordForEmail','resend','inviteUserByEmail'])client.auth[method]=async()=>({data:null,error:{code:'ANDROID_TRANSPORT_DISABLED',message:'Aucun envoi de courriel ou connexion externe dans MIR TEST.'}});
 async function pending(flow,invitation=null){await nativeCall('writeAuth',{slot:'pending',value:JSON.stringify({flow,expires:Date.now()+15*60*1000,...(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(invitation||'')?{invitation}:{})})});}
 if(capabilities.googleEnabled===true&&oauth)client.auth.signInWithOAuth=options=>{sessionEpoch++;return mutateAuth(async()=>{
  await clearSession();
  const result=await oauth({provider:'google',options:{redirectTo:AuthFlow.CALLBACK+'?flow=google',skipBrowserRedirect:true}});
  if(result.error)return result;
  if(!AuthFlow.authorize(result.data?.url))return {error:{code:'AUTH_URL_REFUSED',message:'Adresse de connexion non vérifiée.'}};
  await pending('google',options?.options?.mirInvitation);await nativeCall('openAuth',{url:result.data.url});return result;
 });};
 if(capabilities.recoveryEnabled===true&&reset)client.auth.resetPasswordForEmail=async email=>{
  const result=await reset(email,{redirectTo:AuthFlow.CALLBACK+'?flow=recovery'});
  if(!result.error)await pending('recovery');return result;
 };
 let exchanging=false;
 window.MIRAndroidAcceptAuth=async value=>{
  const entry=AuthFlow.callback(value);if(!entry||exchanging)throw Error('Retour de connexion refusé.');
  exchanging=true;sessionEpoch++;
  try{return await mutateAuth(async()=>{
   const record=await nativeCall('readAuth',{slot:'pending'});let expected;try{expected=JSON.parse(record.value||'null');}catch{}
   if(!expected||expected.flow!==entry.flow||!Number.isFinite(expected.expires)||expected.expires<Date.now()||expected.expires>Date.now()+15*60*1000)throw Error('Connexion expirée. Recommencez depuis MIR TEST.');
   const result=await client.auth.exchangeCodeForSession(entry.code);if(result.error)throw Error('Lien expiré ou connexion refusée.');
   if(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(expected.invitation||'')){const accepted=await rpc('mir_team_accept_invitation',{p_token:expected.invitation});if(accepted.error){await clearSession();throw Error('Invitation refusée pour ce compte.');}}
   const account=await rpc('mir_account_snapshot');if(account.error||!allowedRoles.has(account.data?.role)){await clearSession();throw Error('Accès équipe MIR non confirmé.');}
   await nativeCall('removeAuthSlot',{slot:'pending'});
   // Portal parses the intent; the code and tokens never enter location/history.
   location.replace('chantier.html');
  });}finally{exchanging=false;}
 };
 client.auth.onAuthStateChange(async(event,session)=>{
  const next=session?.user?.id||null,nextToken=session?.access_token||null;
  const purge=event==='SIGNED_OUT'||identity&&next&&identity!==next;
  if(event==='SIGNED_OUT'||next!==identity||nextToken!==identityToken)sessionEpoch++;
  identity=next;identityToken=nextToken;
  // Local purge only: no SDK/Auth call is awaited while its callback runs.
  if(purge){
   if(ownsAuthMutation)await purgeBrowser();
   else{
    const epoch=sessionEpoch;
    // A spontaneous SDK event must return without waiting for an Auth lock.
    // Its eventual local cleanup cannot run over a later stored session.
    mutateAuth(async()=>{authStage('event-guard');if(epoch!==sessionEpoch||identity)return;authStage('event-native-read');const saved=await nativeCall('readAuth');if(!saved.value){authStage('event-browser-purge');await purgeBrowser();}}).catch(()=>console.error('Nettoyage local MIR non confirmé.'));
   }
  }
 });
 window.MIRAndroidSession={currentUserId:()=>identity,pause:()=>client.auth.stopAutoRefresh(),resume:()=>{client.auth.startAutoRefresh();return client.auth.getUser().catch(()=>{});},diagnostic:async()=>{diagnosticPeers.clear();diagnosticChannel?.postMessage({type:'query'});await new Promise(resolve=>setTimeout(resolve,100));const locks=await sharedLocks.query();return{self:diagnosticSnapshot(),peers:[...diagnosticPeers.values()],locks:{held:locks.held,pending:locks.pending}};}};
 if(window.dispatchEvent)window.dispatchEvent(new Event('mir-native-auth-ready'));
 return client;
}});
