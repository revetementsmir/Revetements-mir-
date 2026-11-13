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
public class MirRealRolesTest {
 private Object js(ActivityScenario<MainActivity>s,String expression)throws Exception{CountDownLatch done=new CountDownLatch(1);String[] value={null};s.onActivity(a->a.getBridge().getWebView().evaluateJavascript(expression,r->{value[0]=r;done.countDown();}));assertTrue(done.await(10,TimeUnit.SECONDS));return value[0]==null||value[0].equals("null")?null:new JSONTokener(value[0]).nextValue();}
 private void waitFor(ActivityScenario<MainActivity>s,String expression)throws Exception{long end=SystemClock.uptimeMillis()+30000;while(SystemClock.uptimeMillis()<end){if(Boolean.TRUE.equals(js(s,expression)))return;SystemClock.sleep(150);}fail("MIR TEST Android : résultat serveur non confirmé");}
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
    }else{
     js(s,"window.realProof='pending';MIRPortalActiveClient.signInPassword("+email+","+password+").then(()=>window.realProof='ready').catch(()=>window.realProof='error');true");waitFor(s,"window.realProof==='ready'");
     assertEquals("ready",js(s,"MIRPortalActiveClient.getStatus().phase"));assertEquals(role.getString("role"),js(s,"MIRPortalActiveClient.getStatus().snapshot.operations.role"));
     s.recreate();waitFor(s,"window.MIRPortalActiveClient?.getStatus().phase===\"ready\"");assertEquals(role.getString("role"),js(s,"MIRPortalActiveClient.getStatus().snapshot.operations.role"));
     // Foreign organisation is rejected by the existing server contract.
     js(s,"window.realProof='pending';MIRSupabase.createClient(MIRPortalConfig.supabaseUrl,MIRPortalConfig.publishableKey).rpc('mir_employee_operations_snapshot',{org:'00000000-0000-4000-8000-000000000011',job:null}).then(r=>window.realProof=r.error?'denied':'unexpected');true");waitFor(s,"window.realProof==='denied'");
    }
    js(s,"window.realProof='pending';MIRPortalActiveClient.signOut().then(()=>window.realProof='out');true");waitFor(s,"window.realProof==='out'");assertEquals(null,js(s,"MIRPortalActiveClient.getStatus().snapshot"));
   }
  }finally{assertTrue(credentials.delete());}
 }
}
