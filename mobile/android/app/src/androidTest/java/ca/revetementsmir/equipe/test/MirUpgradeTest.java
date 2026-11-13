package ca.revetementsmir.equipe.test;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.*;
import java.io.File;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class MirUpgradeTest extends MirDeviceSetup {
 private String js(ActivityScenario<MainActivity> s,String code)throws Exception{CountDownLatch latch=new CountDownLatch(1);String[] value={null};s.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,r->{value[0]=r;latch.countDown();}));assertTrue(latch.await(10,TimeUnit.SECONDS));return value[0];}
 private void waitFor(ActivityScenario<MainActivity>s,String expression)throws Exception{long end=android.os.SystemClock.uptimeMillis()+30000;while(android.os.SystemClock.uptimeMillis()<end){if("true".equals(js(s,expression)))return;android.os.SystemClock.sleep(150);}fail("État Android non confirmé : "+expression);}
 private long version()throws Exception{return InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageManager().getPackageInfo("ca.revetementsmir.equipe.test",0).getLongVersionCode();}
 @Test public void prepareUpdate()throws Exception{
  File file=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getFilesDir(),"phase11-roles.json");JSONObject config=new JSONObject(new String(java.nio.file.Files.readAllBytes(file.toPath()),java.nio.charset.StandardCharsets.UTF_8));assertEquals("hxtztkmbfpmzrieccwsg",config.getString("project"));JSONObject employee=config.getJSONArray("roles").getJSONObject(0);assertEquals("employe",employee.getString("role"));
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   assertEquals(110001,version());waitFor(s,"!!window.MIRPortalActiveClient");
   js(s,"window.upgradeProof='pending';MIRPortalActiveClient.signInPassword("+JSONObject.quote(employee.getString("email"))+","+JSONObject.quote(employee.getString("password"))+").then(()=>window.upgradeProof='ready').catch(()=>window.upgradeProof='failed');true");waitFor(s,"window.upgradeProof==='ready' && MIRPortalActiveClient.getStatus().snapshot.operations.role==='employe'");
   assertEquals("true",js(s,"localStorage.setItem('mir_update_probe','RECETTE-PHASE11-LOCAL');localStorage.getItem('mir_update_probe')==='RECETTE-PHASE11-LOCAL'"));
  }
 }
 @Test public void verifyUpdate()throws Exception{
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   assertEquals(110002,version());waitFor(s,"window.MIRPortalActiveClient?.getStatus().phase==='ready'");
   assertEquals("\"employe\"",js(s,"MIRPortalActiveClient.getStatus().snapshot.operations.role"));
   assertEquals("\"RECETTE-PHASE11-LOCAL\"",js(s,"localStorage.getItem('mir_update_probe')"));
  }
 }
}
