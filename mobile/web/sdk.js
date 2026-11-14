const AuthFlow=require('./auth-flow.cjs');
const {Native,Policy}=window.MIRAndroid||{};
if(!Native||!window.MIRSupabase)throw Error('Initialisation Android manquante');
const raw=window.MIRSupabase,allowedRoles=new Set(['employee','employe','chef','chef_equipe','warehouse','assistant','boss']);
let client=null,identity=null,identityToken=null,sessionEpoch=0;
const capabilities=window.MIRTeamTestConfig||{};
async function purgeBrowser(){
 for(const dialog of window.document?.querySelectorAll('dialog[data-mir-native-file]')||[]){dialog.close();dialog.remove();}
 localStorage.clear();sessionStorage.clear();
 if(indexedDB.databases)for(const db of await indexedDB.databases())await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(db.name);request.onsuccess=resolve;request.onerror=request.onblocked=()=>reject(Error('Fermez MIR avant de changer de compte : des données privées sont encore ouvertes.'));});
}
const storageKey='mir_android_test_auth';
let nativeSessionRemovals=0;
const legacyStorage={getItem:async key=>{if(key!==storageKey)return null;if(Native.authLockStatus){const lock=await Native.authLockStatus();if(lock.locked)await (window.MIRAndroidUnlock?window.MIRAndroidUnlock():Native.unlockAuth());}const result=await Native.readAuth();return result.value||null;},setItem:async(key,value)=>{if(key!==storageKey)throw Error('Cette méthode de connexion n’est pas disponible dans MIR TEST.');return Native.writeAuth({value});},removeItem:async key=>{if(key===storageKey){nativeSessionRemovals++;await Native.clearAuth();}}};
// PKCE verifier has its own encrypted slot and never replaces the Auth session.
const verifierKey=storageKey+'-code-verifier';
const pkceKey=key=>key===verifierKey||key===storageKey+'-flows-code-verifier'||new RegExp('^'+storageKey+'-flow-[a-f0-9]{32}-code-verifier$').test(key);
let pkceQueue=Promise.resolve();
function pkceTask(operation){const task=pkceQueue.then(operation);pkceQueue=task.catch(()=>{});return task;}
async function pkceValues(){const value=(await Native.readAuth({slot:'pkce'})).value;if(!value)return {};const parsed=JSON.parse(value);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Connexion locale à recommencer.');return parsed;}
const storage={
 getItem:async key=>pkceKey(key)?pkceTask(async()=> (await pkceValues())[key]||null):legacyStorage.getItem(key),
 setItem:async(key,value)=>pkceKey(key)?pkceTask(async()=>{const values=await pkceValues();values[key]=value;await Native.writeAuth({slot:'pkce',value:JSON.stringify(values)});}):legacyStorage.setItem(key,value),
 removeItem:async key=>pkceKey(key)?pkceTask(async()=>{const values=await pkceValues();delete values[key];if(Object.keys(values).length)await Native.writeAuth({slot:'pkce',value:JSON.stringify(values)});else await Native.removeAuthSlot({slot:'pkce'});}):legacyStorage.removeItem(key)
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
 function mutateAuth(operation){const result=authMutations.then(()=>sharedLocks.request('mir-android-auth-transition',{mode:'exclusive'},async()=>{ownsAuthMutation=true;try{return await operation();}finally{ownsAuthMutation=false;}}));authMutations=result.catch(()=>{});return result;}
 async function clearSession(){const before=nativeSessionRemovals;try{return await signOut({scope:'local'});}finally{identity=null;identityToken=null;if(nativeSessionRemovals===before)await Native.clearAuth();const saved=await Native.readAuth();if(!saved.value)await purgeBrowser();}}
 client.auth.signInWithPassword=credentials=>{sessionEpoch++;return mutateAuth(async()=>{await clearSession();const result=await signIn(credentials);if(result.error)return result;if(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(credentials.options?.mirInvitation||'')){const accepted=await rpc('mir_team_accept_invitation',{p_token:credentials.options.mirInvitation});if(accepted.error){await clearSession();return accepted;}}const account=await rpc('mir_account_snapshot');if(account.error||!allowedRoles.has(account.data?.role)){await clearSession();return forbidden();}return result;});};
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
 async function pending(flow,invitation=null){await Native.writeAuth({slot:'pending',value:JSON.stringify({flow,expires:Date.now()+15*60*1000,...(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(invitation||'')?{invitation}:{})})});}
 if(capabilities.googleEnabled===true&&oauth)client.auth.signInWithOAuth=options=>{sessionEpoch++;return mutateAuth(async()=>{
  await clearSession();
  const result=await oauth({provider:'google',options:{redirectTo:AuthFlow.CALLBACK+'?flow=google',skipBrowserRedirect:true}});
  if(result.error)return result;
  if(!AuthFlow.authorize(result.data?.url))return {error:{code:'AUTH_URL_REFUSED',message:'Adresse de connexion non vérifiée.'}};
  await pending('google',options?.options?.mirInvitation);await Native.openAuth({url:result.data.url});return result;
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
   const record=await Native.readAuth({slot:'pending'});let expected;try{expected=JSON.parse(record.value||'null');}catch{}
   if(!expected||expected.flow!==entry.flow||!Number.isFinite(expected.expires)||expected.expires<Date.now()||expected.expires>Date.now()+15*60*1000)throw Error('Connexion expirée. Recommencez depuis MIR TEST.');
   const result=await client.auth.exchangeCodeForSession(entry.code);if(result.error)throw Error('Lien expiré ou connexion refusée.');
   if(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(expected.invitation||'')){const accepted=await rpc('mir_team_accept_invitation',{p_token:expected.invitation});if(accepted.error){await clearSession();throw Error('Invitation refusée pour ce compte.');}}
   const account=await rpc('mir_account_snapshot');if(account.error||!allowedRoles.has(account.data?.role)){await clearSession();throw Error('Accès équipe MIR non confirmé.');}
   await Native.removeAuthSlot({slot:'pending'});
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
    mutateAuth(async()=>{if(epoch!==sessionEpoch||identity)return;const saved=await Native.readAuth();if(!saved.value)await purgeBrowser();}).catch(()=>console.error('Nettoyage local MIR non confirmé.'));
   }
  }
 });
 window.MIRAndroidSession={currentUserId:()=>identity,pause:()=>client.auth.stopAutoRefresh(),resume:()=>{client.auth.startAutoRefresh();return client.auth.getUser().catch(()=>{});}};
 if(window.dispatchEvent)window.dispatchEvent(new Event('mir-native-auth-ready'));
 return client;
}});
