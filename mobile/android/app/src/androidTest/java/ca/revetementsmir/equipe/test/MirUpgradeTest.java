package ca.revetementsmir.equipe.test;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.*;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class MirUpgradeTest extends MirDeviceSetup {
 private String js(ActivityScenario<MainActivity> s,String code)throws Exception{CountDownLatch latch=new CountDownLatch(1);String[] value={null};s.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,r->{value[0]=r;latch.countDown();}));assertTrue(latch.await(10,TimeUnit.SECONDS));return value[0];}
 private void ready(ActivityScenario<MainActivity> s)throws Exception{long end=android.os.SystemClock.uptimeMillis()+30000;while(android.os.SystemClock.uptimeMillis()<end){if("true".equals(js(s,"!!document.querySelector('#auth-signin-form')")))return;android.os.SystemClock.sleep(150);}fail("Portail Android absent");}
 @Test public void prepareUpdate()throws Exception{try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){ready(s);assertEquals("true",js(s,"localStorage.setItem('mir_update_probe','RECETTE-PHASE11-LOCAL');true"));}}
 @Test public void verifyUpdate()throws Exception{try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){ready(s);assertEquals("\"RECETTE-PHASE11-LOCAL\"",js(s,"localStorage.getItem('mir_update_probe')"));assertEquals(110002,InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageManager().getPackageInfo("ca.revetementsmir.equipe.test",0).getLongVersionCode());}}
}
