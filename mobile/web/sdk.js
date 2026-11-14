const AuthFlow=require('./auth-flow.cjs');
const {Native,Policy}=window.MIRAndroid||{};
if(!Native||!window.MIRSupabase)throw Error('Initialisation Android manquante');
const raw=window.MIRSupabase,allowedRoles=new Set(['employee','employe','chef','chef_equipe','warehouse','assistant','boss']);
let client=null,identity=null;
const capabilities=window.MIRTeamTestConfig||{};
async function purgeBrowser(){
 for(const dialog of window.document?.querySelectorAll('dialog[data-mir-native-file]')||[]){dialog.close();dialog.remove();}
 localStorage.clear();sessionStorage.clear();
 if(indexedDB.databases)for(const db of await indexedDB.databases())await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(db.name);request.onsuccess=resolve;request.onerror=request.onblocked=()=>reject(Error('Fermez MIR avant de changer de compte : des données privées sont encore ouvertes.'));});
}
const storageKey='mir_android_test_auth';
const legacyStorage={getItem:async key=>{if(key!==storageKey)return null;if(Native.authLockStatus){const lock=await Native.authLockStatus();if(lock.locked)await (window.MIRAndroidUnlock?window.MIRAndroidUnlock():Native.unlockAuth());}const result=await Native.readAuth();return result.value||null;},setItem:async(key,value)=>{if(key!==storageKey)throw Error('Cette méthode de connexion n’est pas disponible dans MIR TEST.');return Native.writeAuth({value});},removeItem:async key=>{if(key===storageKey)await Native.clearAuth();}};
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
 client=raw.createClient(url,key,{...options,auth:{...options.auth,storage,storageKey,detectSessionInUrl:false,persistSession:true,flowType:'pkce'}});
 const rpc=client.rpc.bind(client);
 const forbidden=()=>({data:null,error:{code:'42501',message:'Accès réservé aux comptes équipe MIR autorisés. Aucun rôle Admin ou client dans cette application.'}});
 client.rpc=async(name,args,...rest)=>{
  if(capabilities.teamInvitationsEnabled===true&&name==='mir_team_accept_invitation'&&/^[A-Za-z0-9_-]{43}$/.test(args?.p_token||''))return rpc(name,args,...rest);
  const account=await rpc('mir_account_snapshot');
  if(account.error){if(account.error.code==='42501'||[401,403].includes(account.error.status))await client.auth.signOut();return account;}
  if(!allowedRoles.has(account.data?.role)){await client.auth.signOut();return forbidden();}
  return name==='mir_account_snapshot'?account:rpc(name,args,...rest);
 };
 const signIn=client.auth.signInWithPassword.bind(client.auth),signOut=client.auth.signOut.bind(client.auth);
 client.auth.signInWithPassword=async credentials=>{await signOut({scope:'local'});await purgeBrowser();await Native.clearAuth();identity=null;const result=await signIn(credentials);if(result.error)return result;if(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(credentials.options?.mirInvitation||'')){const accepted=await rpc('mir_team_accept_invitation',{p_token:credentials.options.mirInvitation});if(accepted.error){await client.auth.signOut();return accepted;}}const account=await rpc('mir_account_snapshot');if(account.error||!allowedRoles.has(account.data?.role)){await signOut({scope:'local'});await purgeBrowser();await Native.clearAuth();return forbidden();}return result;};
 client.auth.signOut=async()=>{try{return await signOut({scope:'local'});}finally{identity=null;try{await purgeBrowser();}finally{await Native.clearAuth();}}};
 const oauth=client.auth.signInWithOAuth?.bind(client.auth),reset=client.auth.resetPasswordForEmail?.bind(client.auth);
 for(const method of ['signUp','signInWithOAuth','signInWithOtp','resetPasswordForEmail','resend','inviteUserByEmail'])client.auth[method]=async()=>({data:null,error:{code:'ANDROID_TRANSPORT_DISABLED',message:'Aucun envoi de courriel ou connexion externe dans MIR TEST.'}});
 async function pending(flow,invitation=null){await Native.writeAuth({slot:'pending',value:JSON.stringify({flow,expires:Date.now()+15*60*1000,...(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(invitation||'')?{invitation}:{})})});}
 if(capabilities.googleEnabled===true&&oauth)client.auth.signInWithOAuth=async options=>{
  await signOut({scope:'local'});await purgeBrowser();await Native.clearAuth();identity=null;
  const result=await oauth({provider:'google',options:{redirectTo:AuthFlow.CALLBACK+'?flow=google',skipBrowserRedirect:true}});
  if(result.error)return result;
  if(!AuthFlow.authorize(result.data?.url))return {error:{code:'AUTH_URL_REFUSED',message:'Adresse de connexion non vérifiée.'}};
  await pending('google',options?.options?.mirInvitation);await Native.openAuth({url:result.data.url});return result;
 };
 if(capabilities.recoveryEnabled===true&&reset)client.auth.resetPasswordForEmail=async email=>{
  const result=await reset(email,{redirectTo:AuthFlow.CALLBACK+'?flow=recovery'});
  if(!result.error)await pending('recovery');return result;
 };
 let exchanging=false;
 window.MIRAndroidAcceptAuth=async value=>{
  const entry=AuthFlow.callback(value);if(!entry||exchanging)throw Error('Retour de connexion refusé.');
  exchanging=true;
  try{
   const record=await Native.readAuth({slot:'pending'});let expected;try{expected=JSON.parse(record.value||'null');}catch{}
   if(!expected||expected.flow!==entry.flow||!Number.isFinite(expected.expires)||expected.expires<Date.now()||expected.expires>Date.now()+15*60*1000)throw Error('Connexion expirée. Recommencez depuis MIR TEST.');
   const result=await client.auth.exchangeCodeForSession(entry.code);if(result.error)throw Error('Lien expiré ou connexion refusée.');
   if(capabilities.teamInvitationsEnabled===true&&/^[A-Za-z0-9_-]{43}$/.test(expected.invitation||'')){const accepted=await rpc('mir_team_accept_invitation',{p_token:expected.invitation});if(accepted.error){await client.auth.signOut();throw Error('Invitation refusée pour ce compte.');}}
   const account=await rpc('mir_account_snapshot');if(account.error||!allowedRoles.has(account.data?.role)){await client.auth.signOut();throw Error('Accès équipe MIR non confirmé.');}
   await Native.removeAuthSlot({slot:'pending'});
   // Portal parses the intent; the code and tokens never enter location/history.
   location.replace('chantier.html');
  }finally{exchanging=false;}
 };
 client.auth.onAuthStateChange((event,session)=>{
  const next=session?.user?.id||null;
  if(event==='SIGNED_OUT'||identity&&next&&identity!==next)purgeBrowser().catch(()=>{});
  identity=next;
 });
 window.MIRAndroidSession={currentUserId:()=>identity,pause:()=>client.auth.stopAutoRefresh(),resume:()=>{client.auth.startAutoRefresh();client.auth.getUser().then(({error})=>{if(error&&[401,403].includes(error.status))client.auth.signOut();}).catch(()=>{});}};
 if(window.dispatchEvent)window.dispatchEvent(new Event('mir-native-auth-ready'));
 return client;
}});
