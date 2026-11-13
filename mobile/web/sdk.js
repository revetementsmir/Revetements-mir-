const {Native,Policy}=window.MIRAndroid||{};
if(!Native||!window.MIRSupabase)throw Error('Initialisation Android manquante');
const raw=window.MIRSupabase,allowedRoles=new Set(['employee','employe','chef','chef_equipe','warehouse','assistant','boss']);
let client=null,identity=null;
async function purgeBrowser(){
 localStorage.clear();sessionStorage.clear();
 if(indexedDB.databases)for(const db of await indexedDB.databases())await new Promise((resolve,reject)=>{const request=indexedDB.deleteDatabase(db.name);request.onsuccess=resolve;request.onerror=request.onblocked=()=>reject(Error('Fermez MIR avant de changer de compte : des données privées sont encore ouvertes.'));});
}
const storageKey='mir_android_test_auth';
const storage={getItem:async key=>{if(key!==storageKey)return null;const result=await Native.readAuth();return result.value||null;},setItem:async(key,value)=>{if(key!==storageKey)throw Error('Cette méthode de connexion n’est pas disponible dans MIR TEST.');return Native.writeAuth({value});},removeItem:async key=>{if(key===storageKey)await Native.clearAuth();}};
window.MIRSupabase=Object.freeze({createClient(url,key,options={}){
 if(url!=='https://'+Policy.TEST||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))throw Error('Projet MIR TEST obligatoire');
 if(client)return client;
 client=raw.createClient(url,key,{...options,auth:{...options.auth,storage,storageKey,detectSessionInUrl:false,persistSession:true}});
 const rpc=client.rpc.bind(client);
 const forbidden=()=>({data:null,error:{code:'42501',message:'Accès réservé aux comptes équipe MIR autorisés. Aucun rôle Admin ou client dans cette application.'}});
 client.rpc=async(name,args,...rest)=>{
  const account=await rpc('mir_account_snapshot');
  if(account.error)return account;
  if(!allowedRoles.has(account.data?.role))return forbidden();
  return name==='mir_account_snapshot'?account:rpc(name,args,...rest);
 };
 const signIn=client.auth.signInWithPassword.bind(client.auth),signOut=client.auth.signOut.bind(client.auth);
 client.auth.signInWithPassword=async credentials=>{await signOut({scope:'local'});await purgeBrowser();await Native.clearAuth();identity=null;const result=await signIn(credentials);if(result.error)return result;const account=await rpc('mir_account_snapshot');if(account.error||!allowedRoles.has(account.data?.role)){await signOut({scope:'local'});await purgeBrowser();await Native.clearAuth();return forbidden();}return result;};
 client.auth.signOut=async()=>{try{return await signOut({scope:'local'});}finally{identity=null;try{await purgeBrowser();}finally{await Native.clearAuth();}}};
 for(const method of ['signUp','signInWithOAuth','signInWithOtp','resetPasswordForEmail','resend','inviteUserByEmail'])client.auth[method]=async()=>({data:null,error:{code:'ANDROID_TRANSPORT_DISABLED',message:'Aucun envoi de courriel ou connexion externe dans MIR TEST.'}});
 client.auth.onAuthStateChange((event,session)=>{
  const next=session?.user?.id||null;
  if(event==='SIGNED_OUT'||identity&&next&&identity!==next)setTimeout(()=>purgeBrowser().catch(()=>{}),0);
  identity=next;
 });
 window.MIRAndroidSession={pause:()=>client.auth.stopAutoRefresh(),resume:()=>{client.auth.startAutoRefresh();client.auth.getUser().then(({error})=>{if(error&&[401,403].includes(error.status))client.auth.signOut();}).catch(()=>{});}};
 return client;
}});
