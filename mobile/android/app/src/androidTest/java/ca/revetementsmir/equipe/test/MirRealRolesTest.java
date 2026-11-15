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
 private Object js(ActivityScenario<MainActivity>s,String expression)throws Exception{CountDownLatch done=new CountDownLatch(1);String[] value={null};s.onActivity(a->a.getBridge().getWebView().evaluateJavascript(expression,r->{value[0]=r;done.countDown();}));assertTrue(done.await(10,TimeUnit.SECONDS));return value[0]==null||value[0].equals("null")?null:new JSONTokener(value[0]).nextValue();}
 private void waitFor(ActivityScenario<MainActivity>s,String expression)throws Exception{long end=SystemClock.uptimeMillis()+30000;while(SystemClock.uptimeMillis()<end){if(Boolean.TRUE.equals(js(s,expression)))return;SystemClock.sleep(150);}screenshotSystem("failed-real-roles");fail("MIR TEST Android : résultat serveur non confirmé; état="+js(s,"JSON.stringify({proof:window.realProof,code:window.realProofCode,phase:MIRPortalActiveClient?.getStatus().phase,error:MIRPortalActiveClient?.getStatus().error?.code,online:navigator.onLine,project:MIRPortalConfig.projectRef})"));}
 private void screenshot(ActivityScenario<MainActivity>s,String name)throws Exception{
  // Wait for the rendered WebView frame, not only a changed DOM attribute.
  CountDownLatch drawn=new CountDownLatch(1);
  s.onActivity(a->a.getBridge().getWebView().postVisualStateCallback(1,new android.webkit.WebView.VisualStateCallback(){@Override public void onComplete(long id){drawn.countDown();}}));
  assertTrue("WebView frame ready",drawn.await(10,TimeUnit.SECONDS));
  CountDownLatch presented=new CountDownLatch(1);
  s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.invalidate();web.postOnAnimation(()->web.postOnAnimation(()->web.postOnAnimation(presented::countDown)));});
  assertTrue("WebView frame presented",presented.await(10,TimeUnit.SECONDS));
  InstrumentationRegistry.getInstrumentation().waitForIdleSync();
  androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).waitForIdle();
  screenshotSystem(name);
 }
 private void screenshotSystem(String name)throws Exception{
  androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).waitForIdle();
  File dir=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"phase11-proof");assertTrue(dir.isDirectory()||dir.mkdirs());
  File file=new File(dir,name+".png");assertFalse("Never overwrite native proof",file.exists());
  android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);
  try(FileOutputStream out=new FileOutputStream(file)){assertTrue(bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out));}finally{bitmap.recycle();}
 }
 private void inspectMenu(ActivityScenario<MainActivity>s,String role)throws Exception{
  js(s,"scrollTo(0,0);document.querySelector('.mir-harmony-toggle').click();true");
  waitFor(s,"document.querySelector('#mir-harmony-menu')?.hidden===false");
  assertEquals(Boolean.FALSE,js(s,"MIRAndroid.Policy.allowedRoute('https://localhost/production.html?mode=client')"));
  assertEquals(Boolean.FALSE,js(s,"MIRAndroid.Policy.allowedRoute('https://localhost/chantier.html?estimate=1')"));
  assertEquals(Boolean.TRUE,js(s,"MIRAndroid.Policy.allowedRoute('https://localhost/production.html?mode=client&source=store&kind=profile')"));
  assertEquals("undefined",js(s,"typeof window.MIREstimate"));
  // The exact regression observed in the original native PNGs: a public link
  // survives relocation or late insertion into the shared header.
  waitFor(s,"[...document.querySelectorAll('#mir-harmony-menu a[href]')].every(a=>MIRAndroid.Policy.allowedRoute(a.href,location.origin)||!a.getClientRects().length)");
  assertEquals(Boolean.TRUE,js(s,"[...document.querySelectorAll('#portal-navigation button')].some(b=>b.getClientRects().length)"));
  screenshot(s,"v120006-"+role+"-menu");
  js(s,"document.querySelector('.mir-harmony-toggle').click();scrollTo(0,0);true");
  screenshot(s,"v120006-"+role+"-home");
  js(s,"document.querySelector('[data-view=settings]').click();true");
  waitFor(s,"!!document.querySelector('#harmony-settings-form') && document.querySelector('.settings-status')?.textContent==='Enregistré dans votre compte MIR'");
  js(s,"scrollTo(0,0);true");screenshot(s,"v120006-"+role+"-settings");
  if(role.equals("employe")){
   js(s,"document.querySelector('.mir-harmony-toggle').click();document.querySelector('#portal-navigation [data-view=account]').click();document.querySelector('[data-view=absences]').click();true");
   waitFor(s,"!!document.querySelector('#absence-draft-form textarea[name=note]')");
   js(s,"scrollTo(0,0);true");screenshot(s,"v120006-employee-absence-form");
   js(s,"(()=>{const n=document.querySelector('#absence-draft-form textarea[name=note]');n.value='RECETTE-PHASE11-VISUEL-LOCAL';n.dispatchEvent(new Event('input',{bubbles:true}));n.scrollIntoView({block:'center'});})()");
   assertEquals("RECETTE-PHASE11-VISUEL-LOCAL",js(s,"document.querySelector('#absence-draft-form textarea[name=note]').value"));
   screenshot(s,"v120006-employee-local-note");
   androidx.test.uiautomator.UiDevice device=androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());device.pressBack();
   androidx.test.uiautomator.UiObject2 cancel=device.wait(androidx.test.uiautomator.Until.findObject(androidx.test.uiautomator.By.res("android:id/button2")),5000);
   assertNotNull("Android back requires confirmation for local input",cancel);screenshotSystem("v120006-employee-back-confirmation");cancel.click();
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
