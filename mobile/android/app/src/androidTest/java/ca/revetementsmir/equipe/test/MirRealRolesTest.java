package ca.revetementsmir.equipe.test;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import android.os.SystemClock;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.io.*;
import java.util.concurrent.*;
import static org.junit.Assert.*;
/** Required CI integration test, secrets supplied privately at runtime, never in the APK. */
@RunWith(AndroidJUnit4.class)
public class MirRealRolesTest extends MirDeviceSetup {
 private Object js(ActivityScenario<MainActivity>s,String expression)throws Exception{
  CountDownLatch done=new CountDownLatch(1);String[] value={null};
  String body=expression.endsWith(";true")?expression.substring(0,expression.length()-4)+"return true;":"return ("+expression+");";
  String script="(()=>{try{return {ok:true,value:(()=>{"+body+"})()};}catch(e){return {ok:false,error:e.message};}})()";
  s.onActivity(a->a.getBridge().getWebView().evaluateJavascript(script,r->{value[0]=r;done.countDown();}));assertTrue(done.await(10,TimeUnit.SECONDS));
  assertNotNull("JavaScript test returned no result",value[0]);JSONObject result=new JSONObject(value[0]);assertTrue("JavaScript test: "+result.optString("error"),result.getBoolean("ok"));
  Object resultValue=result.opt("value");return resultValue==JSONObject.NULL?null:resultValue;
 }
 private void waitFor(ActivityScenario<MainActivity>s,String expression)throws Exception{long end=SystemClock.uptimeMillis()+30000;while(SystemClock.uptimeMillis()<end){if(Boolean.TRUE.equals(js(s,expression)))return;SystemClock.sleep(150);}screenshotSystem("failed-real-roles");fail("MIR TEST Android : résultat serveur non confirmé; état="+js(s,"JSON.stringify({proof:window.realProof,code:window.realProofCode,phase:MIRPortalActiveClient?.getStatus().phase,error:MIRPortalActiveClient?.getStatus().error?.code,online:navigator.onLine,project:MIRPortalConfig.projectRef})"));}
 private final java.util.Map<String,JSONObject> nativeProofs=new java.util.LinkedHashMap<>();
 private File proofDirectory(){File dir=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"phase11-proof");assertTrue(dir.isDirectory()||dir.mkdirs());return dir;}
 private static String hex(byte[] bytes){StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();}
 private static String pixelHash(android.graphics.Bitmap bitmap,android.graphics.Rect area)throws Exception{
  assertTrue("Screenshot content crop within real display",area.left>=0&&area.top>=0&&area.right<=bitmap.getWidth()&&area.bottom<=bitmap.getHeight()&&area.width()>0&&area.height()>0);
  android.graphics.Bitmap readable=bitmap.getConfig()==android.graphics.Bitmap.Config.HARDWARE?bitmap.copy(android.graphics.Bitmap.Config.ARGB_8888,false):bitmap;assertNotNull(readable);
  try{java.security.MessageDigest digest=java.security.MessageDigest.getInstance("SHA-256");int[] row=new int[area.width()];java.nio.ByteBuffer bytes=java.nio.ByteBuffer.allocate(row.length*4);
   for(int y=area.top;y<area.bottom;y++){readable.getPixels(row,0,row.length,area.left,y,row.length,1);bytes.clear();bytes.asIntBuffer().put(row);digest.update(bytes.array());}return hex(digest.digest());
  }finally{if(readable!=bitmap)readable.recycle();}
 }
 private void presentFrame(ActivityScenario<MainActivity>s)throws Exception{
  CountDownLatch drawn=new CountDownLatch(1);
  s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();assertTrue("Visible resumed WebView",web.isShown()&&web.hasWindowFocus());web.postVisualStateCallback(SystemClock.uptimeMillis(),new android.webkit.WebView.VisualStateCallback(){@Override public void onComplete(long id){drawn.countDown();}});web.invalidate();});
  assertTrue("WebView frame ready",drawn.await(10,TimeUnit.SECONDS));
  CountDownLatch presented=new CountDownLatch(1);s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.postOnAnimation(()->web.postOnAnimation(presented::countDown));});assertTrue("WebView frame presented",presented.await(10,TimeUnit.SECONDS));InstrumentationRegistry.getInstrumentation().waitForIdleSync();
 }
 private JSONObject saveScreenshot(String name,android.graphics.Bitmap bitmap,android.graphics.Rect content)throws Exception{
  File file=new File(proofDirectory(),name+".png");assertFalse("Never overwrite native proof",file.exists());
  try(FileOutputStream out=new FileOutputStream(file)){assertTrue(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));}
  JSONObject proof=new JSONObject().put("file",file.getName()).put("capture","UiAutomation.takeScreenshot").put("width",bitmap.getWidth()).put("height",bitmap.getHeight()).put("sha256",hex(java.security.MessageDigest.getInstance("SHA-256").digest(java.nio.file.Files.readAllBytes(file.toPath()))));
  if(content!=null)proof.put("contentSha256",pixelHash(bitmap,content)).put("crop",new JSONObject().put("left",content.left).put("top",content.top).put("right",content.right).put("bottom",content.bottom));nativeProofs.put(name,proof);return proof;
 }
 private JSONObject screenshot(ActivityScenario<MainActivity>s,String name)throws Exception{presentFrame(s);return screenshotSystem(name);}
 private JSONObject screenshotSystem(String name)throws Exception{
  androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).waitForIdle(1000);
  android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);try{return saveScreenshot(name,bitmap,null);}finally{bitmap.recycle();}
 }
 private void tap(ActivityScenario<MainActivity>s,String selector)throws Exception{
  // Native pointer input: no programmatic DOM click that can precede presentation.
  JSONObject point=(JSONObject)js(s,"(()=>{const n=document.querySelector("+JSONObject.quote(selector)+");if(!n)throw Error('Native target missing');n.scrollIntoView({block:'nearest',inline:'nearest'});const r=n.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,width:innerWidth,height:innerHeight,w:r.width,h:r.height};})()");
  assertTrue("Native target has visible bounds",point.getDouble("w")>0&&point.getDouble("h")>0&&point.getDouble("x")>=0&&point.getDouble("y")>=0&&point.getDouble("x")<point.getDouble("width")&&point.getDouble("y")<point.getDouble("height"));int[] loc=new int[4];s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.getLocationOnScreen(loc);loc[2]=web.getWidth();loc[3]=web.getHeight();});
  int x=loc[0]+(int)Math.round(point.getDouble("x")*loc[2]/point.getDouble("width")),y=loc[1]+(int)Math.round(point.getDouble("y")*loc[3]/point.getDouble("height"));assertTrue("Native tap delivered",androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).click(x,y));
 }
 private android.graphics.Rect contentArea(ActivityScenario<MainActivity>s)throws Exception{
  JSONObject p=(JSONObject)js(s,"(()=>{const h=document.querySelector('#field-header').getBoundingClientRect(),n=document.querySelector('#portal-navigation').getBoundingClientRect(),b=document.querySelector('#mir-native-state')?.getBoundingClientRect();return{width:innerWidth,height:innerHeight,top:Math.max(h.bottom,b?.bottom||0)+8,bottom:n.top-8};})()");
  int[] loc=new int[4];s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.getLocationOnScreen(loc);loc[2]=web.getWidth();loc[3]=web.getHeight();});double sx=loc[2]/p.getDouble("width"),sy=loc[3]/p.getDouble("height");return new android.graphics.Rect(loc[0]+(int)(8*sx),loc[1]+(int)Math.ceil(p.getDouble("top")*sy),loc[0]+loc[2]-(int)(8*sx),loc[1]+(int)Math.floor(p.getDouble("bottom")*sy));
 }
 private String fieldContent(String tab){
  String nav="document.querySelector('#portal-navigation [data-view="+tab+"]')?.getAttribute('aria-current')==='page'";
  String content;
  switch(tab){
   case "day":content="!!document.querySelector('.field-home .field-job-hero') && document.querySelector('#portal-content h1')?.textContent.startsWith('Bonjour, ') && document.querySelector('.field-job-hero small')?.textContent.includes('QA-UX') && !!document.querySelector('[data-route-job]')";break;
   case "command":content="document.querySelector('#portal-content h1')?.textContent==='Commande' && !!document.querySelector('[data-field-catalogue=material]') && !!document.querySelector('[data-field-catalogue=fold]') && !!document.querySelector('[data-field-draw]')";break;
   case "punch":content="document.querySelector('#portal-content h1')?.textContent==='Punch' && !!document.querySelector('.field-punch-clock') && !!document.querySelector('[data-punch]') && !!document.querySelector('[data-punch-forgot]')";break;
   case "messages":content="document.querySelector('#portal-content h1')?.textContent==='Conversations' && !!document.querySelector('#chat-search-form') && !!document.querySelector('.chat-workspace')";break;
   case "more":content="document.querySelector('#portal-content h1')?.textContent==='Plus' && !!document.querySelector('#portal-content [data-view=absences]') && !!document.querySelector('#portal-content [data-view=expenses]') && !!document.querySelector('#portal-content [data-field-request=tool]')";break;
   default:throw new IllegalArgumentException("Unknown field tab");
  }return "("+nav+") && ("+content+") && !document.querySelector('dialog[open]')";
 }
 private JSONObject renderedScreenshot(ActivityScenario<MainActivity>s,String name,String expected,android.graphics.Rect fixedContent,java.util.Set<String> forbidden)throws Exception{
  waitFor(s,expected);presentFrame(s);long deadline=SystemClock.uptimeMillis()+12000,stableSince=0;String previous=null;int attempts=0;
  while(SystemClock.uptimeMillis()<deadline){
   assertEquals("Screen DOM remains bound to requested content",Boolean.TRUE,js(s,expected));androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).waitForIdle(500);android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);attempts++;
   try{String hash=pixelHash(bitmap,fixedContent);boolean unique=!forbidden.contains(hash);if(!unique||!hash.equals(previous)){previous=hash;stableSince=SystemClock.uptimeMillis();}else if(SystemClock.uptimeMillis()-stableSince>=250){JSONObject proof=saveScreenshot(name,bitmap,fixedContent).put("presentationAttempts",attempts).put("domHeading",js(s,"document.querySelector('#portal-content h1')?.textContent||''"));return proof;}}finally{bitmap.recycle();}
   presentFrame(s);SystemClock.sleep(120);
  }
  JSONObject rejected=screenshotSystem(name+"-rejected");fail("Requested DOM never produced a stable distinct native content frame: "+name+"; rejected="+rejected.getString("file"));return null;
 }
 private void writeFieldProof(String role,java.util.Map<String,JSONObject> tabs,JSONObject home,JSONObject menu,JSONObject fixture)throws Exception{
  java.util.Set<String> pngs=new java.util.HashSet<>(),contents=new java.util.HashSet<>();JSONObject screens=new JSONObject();for(java.util.Map.Entry<String,JSONObject> entry:tabs.entrySet()){assertTrue("Five distinct PNGs",pngs.add(entry.getValue().getString("sha256")));assertTrue("Five distinct body pixel frames",contents.add(entry.getValue().getString("contentSha256")));screens.put(entry.getKey(),entry.getValue());}assertEquals(5,screens.length());assertNotEquals("Account panel differs from home PNG",home.getString("sha256"),menu.getString("sha256"));assertNotEquals("Account panel differs from home content",home.getString("contentSha256"),menu.getString("contentSha256"));
  JSONObject report=new JSONObject().put("role",role).put("capture","Android system UiAutomation").put("physicalDevice",false).put("versionCode",InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageManager().getPackageInfo("ca.revetementsmir.equipe.test",0).getLongVersionCode()).put("fixture",fixture).put("screens",screens).put("home",home).put("menu",menu);File file=new File(proofDirectory(),"v130002-"+role+"-screens.json");assertFalse("Never overwrite screen manifest",file.exists());java.nio.file.Files.write(file.toPath(),report.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));
 }
 private void inspectMenu(ActivityScenario<MainActivity>s,String role)throws Exception{
  boolean field=role.equals("employe")||role.equals("chef_equipe");
  android.graphics.Rect fieldCrop=null;JSONObject homeProof=null;JSONObject fixture=null;java.util.Map<String,JSONObject> tabProofs=new java.util.LinkedHashMap<>();java.util.Set<String> contentHashes=new java.util.HashSet<>();
  if(field){
   waitFor(s,"document.body.dataset.fieldShell==='true' && !!document.querySelector('#field-header')");
   assertEquals("Accueil|Commande|Punch|Message|Plus",js(s,"[...document.querySelectorAll('#portal-navigation button span')].map(n=>n.textContent).join('|')"));
   assertEquals(Boolean.TRUE,js(s,"!!document.querySelector('[data-field-cart]') && !!document.querySelector('[data-field-profile]')"));
   String expectedName=role.equals("chef_equipe")?"Chef MIR Recette":"Employé MIR Recette";
   waitFor(s,"(()=>{const s=MIRPortalActiveClient.getStatus().snapshot,m=s?.members?.find(m=>m.id===s.actorId);return m?.name==="+JSONObject.quote(expectedName)+" && ['7da20261-1114-4000-8000-000000000001','7da20261-1114-4000-8000-000000000002'].every(id=>s.jobs?.some(j=>j.id===id&&j.assignedMemberIds?.includes(s.actorId)));})()");
   // Choose an authorized representative job using the actual native controls.
   tap(s,"#portal-content [data-view=jobs]");waitFor(s,"!!document.querySelector('.field-job-list [data-field-open-job=\"7da20261-1114-4000-8000-000000000001\"]')");
   tap(s,"[data-field-open-job=\"7da20261-1114-4000-8000-000000000001\"]");waitFor(s,"!!document.querySelector('.field-dossier')");
   tap(s,"#field-header [data-view=day]");waitFor(s,fieldContent("day"));
   if(role.equals("chef_equipe"))waitFor(s,"(()=>{const l=MIRPortalActiveClient.getStatus().snapshot.lead;return l?.selectedJobId==='7da20261-1114-4000-8000-000000000001' && l.assignment?.jobId===l.selectedJobId && l.team?.length>0 && l.tasks?.length>0;})()");
   fixture=(JSONObject)js(s,"(()=>{const s=MIRPortalActiveClient.getStatus().snapshot;return{actorId:s.actorId,name:s.members.find(m=>m.id===s.actorId).name,qaJobCount:s.jobs.filter(j=>['7da20261-1114-4000-8000-000000000001','7da20261-1114-4000-8000-000000000002'].includes(j.id)).length,selectedJobId:s.lead?.selectedJobId||'7da20261-1114-4000-8000-000000000001',teamCount:s.lead?.team?.length||0,taskCount:s.lead?.tasks?.length||0};})()");
   fieldCrop=contentArea(s);
   for(String tab:new String[]{"day","command","punch","messages","more"}){
    tap(s,"#portal-navigation [data-view="+tab+"]");waitFor(s,fieldContent(tab));
    JSONObject proof=renderedScreenshot(s,"v130002-"+role+"-"+tab,fieldContent(tab),fieldCrop,contentHashes);assertTrue("Distinct presented content for "+tab,contentHashes.add(proof.getString("contentSha256")));tabProofs.put(tab,proof);
   }
   tap(s,"#portal-navigation [data-view=day]");waitFor(s,fieldContent("day"));
   homeProof=renderedScreenshot(s,"v130002-"+role+"-home",fieldContent("day"),fieldCrop,java.util.Collections.emptySet());
   tap(s,"[data-field-profile]");waitFor(s,"document.querySelector('#portal-dialog')?.open===true && document.querySelector('#portal-dialog h2')?.textContent==="+JSONObject.quote(expectedName));
  }else{
   tap(s,".mir-harmony-toggle");waitFor(s,"document.querySelector('#mir-harmony-menu')?.hidden===false");
  }
  assertEquals(Boolean.FALSE,js(s,"MIRAndroid.Policy.allowedRoute('https://localhost/production.html?mode=client')"));
  assertEquals(Boolean.FALSE,js(s,"MIRAndroid.Policy.allowedRoute('https://localhost/chantier.html?estimate=1')"));
  assertEquals(Boolean.TRUE,js(s,"MIRAndroid.Policy.allowedRoute('https://localhost/production.html?mode=client&source=store&kind=profile')"));
  assertEquals("undefined",js(s,"typeof window.MIREstimate"));
  // The exact regression observed in the original native PNGs: a public link
  // survives relocation or late insertion into the shared header.
  waitFor(s,"[...document.querySelectorAll('#mir-harmony-menu a[href]')].every(a=>MIRAndroid.Policy.allowedRoute(a.href,location.origin)||!a.getClientRects().length)");
  assertEquals(Boolean.TRUE,js(s,"[...document.querySelectorAll('#portal-navigation button')].some(b=>b.getClientRects().length)"));
  if(field){JSONObject menuProof=renderedScreenshot(s,"v130002-"+role+"-menu","document.querySelector('#portal-dialog')?.open===true && !!document.querySelector('#portal-dialog [data-view=settings]') && !!document.querySelector('#portal-dialog #portal-signout')",fieldCrop,java.util.Collections.singleton(homeProof.getString("contentSha256")));writeFieldProof(role,tabProofs,homeProof,menuProof,fixture);}else screenshot(s,"v130002-"+role+"-menu");
  if(field){tap(s,"[data-close-dialog]");waitFor(s,fieldContent("day"));}else tap(s,".mir-harmony-toggle");
  if(!field)screenshot(s,"v130002-"+role+"-home");
  if(field){tap(s,"[data-field-profile]");waitFor(s,"document.querySelector('#portal-dialog')?.open===true");tap(s,"#portal-dialog [data-view=settings]");}else tap(s,"[data-view=settings]");
  waitFor(s,"!!document.querySelector('#harmony-settings-form') && document.querySelector('.settings-status')?.textContent==='Enregistré dans votre compte MIR'");
  js(s,"scrollTo(0,0);true");screenshot(s,"v130002-"+role+"-settings");
  if(role.equals("employe")){
   js(s,"document.querySelector('#portal-navigation [data-view=more]').click();true");
   waitFor(s,"document.querySelector('#portal-navigation [data-view=more]')?.getAttribute('aria-current')==='page' && !!document.querySelector('#portal-content [data-view=absences]')");
   js(s,"document.querySelector('#portal-content [data-view=absences]').click();true");
   waitFor(s,"!!document.querySelector('#absence-draft-form') && !!document.querySelector('.absence-compose summary')");
   js(s,"document.querySelector('.absence-compose summary').click();true");
   waitFor(s,"document.querySelector('.absence-compose')?.open===true && document.querySelector('#absence-draft-form textarea[name=note]')?.getClientRects().length>0");
   js(s,"scrollTo(0,0);true");screenshot(s,"v130002-employee-absence-form");
   js(s,"(()=>{const n=document.querySelector('#absence-draft-form textarea[name=note]');n.value='RECETTE-PHASE11-VISUEL-LOCAL';n.dispatchEvent(new Event('input',{bubbles:true}));n.scrollIntoView({block:'center'});})()");
   assertEquals("RECETTE-PHASE11-VISUEL-LOCAL",js(s,"document.querySelector('#absence-draft-form textarea[name=note]').value"));
   screenshot(s,"v130002-employee-local-note");
   androidx.test.uiautomator.UiDevice device=androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());device.pressBack();
   androidx.test.uiautomator.UiObject2 cancel=device.wait(androidx.test.uiautomator.Until.findObject(androidx.test.uiautomator.By.res("android:id/button2")),5000);
   assertNotNull("Android back requires confirmation for local input",cancel);screenshotSystem("v130002-employee-back-confirmation");cancel.click();
   assertEquals("RECETTE-PHASE11-VISUEL-LOCAL",js(s,"document.querySelector('#absence-draft-form textarea[name=note]').value"));
   // No submit, save, upload or preference change; the ordinary sign-out follows.
  }

 }
 @Test public void fiveBusinessRolesAndTechnicalAdmin()throws Exception{
  File credentials=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getFilesDir(),"phase11-roles.json");
  JSONObject config=new JSONObject(new String(java.nio.file.Files.readAllBytes(credentials.toPath()),java.nio.charset.StandardCharsets.UTF_8));
  assertEquals("hxtztkmbfpmzrieccwsg",config.getString("project"));
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!window.MIRPortalActiveClient");assertEquals("hxtztkmbfpmzrieccwsg",js(s,"MIRPortalConfig.projectRef"));
   JSONArray roles=config.getJSONArray("roles");assertEquals(6,roles.length());
   for(int i=0;i<roles.length();i++){
    JSONObject role=roles.getJSONObject(i);String email=JSONObject.quote(role.getString("email")),password=JSONObject.quote(role.getString("password"));
    if(role.getString("role").equals("admin")){
     js(s,"window.realProof='pending';MIRSupabase.createClient(MIRPortalConfig.supabaseUrl,MIRPortalConfig.publishableKey).auth.signInWithPassword({email:"+email+",password:"+password+"}).then(r=>window.realProof=r.error?.code||'unexpected').catch(()=>window.realProof='error');true");
     waitFor(s,"window.realProof==='42501'");
     assertNotEquals("ready",js(s,"MIRPortalActiveClient.getStatus().phase"));assertEquals(Boolean.TRUE,js(s,"document.querySelector('#account-bar').hidden"));
    }else{
     js(s,"window.realProof='pending';MIRPortalActiveClient.signInPassword("+email+","+password+").then(()=>window.realProof='ready').catch(e=>{window.realProofCode=e.code||'unknown';window.realProof='error';});true");waitFor(s,"window.realProof==='ready' && MIRPortalActiveClient.getStatus().phase==='ready'");
     assertEquals("ready",js(s,"MIRPortalActiveClient.getStatus().phase"));assertEquals(role.getString("role"),js(s,"MIRPortalActiveClient.getStatus().snapshot.operations.role"));
     String label=role.getString("role").equals("employe")?"Employé chantier":role.getString("role").equals("chef_equipe")?"Chef d’équipe":role.getString("role").equals("warehouse")?"Entrepôt et livraison":role.getString("role").equals("assistant")?"Adjointe":"Boss";
     waitFor(s,"document.body.dataset.portalConnection==='connected'");assertEquals(label,js(s,"document.querySelector('#account-role').textContent"));assertEquals(Boolean.TRUE,js(s,"document.querySelector('#portal-content').children.length>0"));
     s.recreate();waitFor(s,"window.MIRPortalActiveClient?.getStatus().phase===\"ready\"");assertEquals(role.getString("role"),js(s,"MIRPortalActiveClient.getStatus().snapshot.operations.role"));waitFor(s,"document.body.dataset.portalConnection==='connected'");assertEquals(label,js(s,"document.querySelector('#account-role').textContent"));
     inspectMenu(s,role.getString("role"));
     // Foreign organisation is rejected by the existing server contract.
     js(s,"window.realProof='pending';MIRSupabase.createClient(MIRPortalConfig.supabaseUrl,MIRPortalConfig.publishableKey).rpc('mir_employee_operations_snapshot',{org:'00000000-0000-4000-8000-000000000011',job:null}).then(r=>window.realProof=r.error?.code==='42501'?'denied':'unexpected');true");waitFor(s,"window.realProof==='denied'");
    }
    js(s,"window.realProof='pending';MIRPortalActiveClient.signOut().then(()=>window.realProof='out');true");waitFor(s,"window.realProof==='out'");assertEquals(null,js(s,"MIRPortalActiveClient.getStatus().snapshot"));
   }
  }finally{assertTrue(credentials.delete());}
 }
}
