package ca.revetementsmir.equipe.test;

import android.content.Context;
import android.content.pm.ActivityInfo;
import android.os.SystemClock;
import android.graphics.Bitmap;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.UiDevice;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONTokener;
import java.io.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class MirAndroidTest {
 private Object js(ActivityScenario<MainActivity> scenario,String expression)throws Exception{
  CountDownLatch done=new CountDownLatch(1);String[] result={null};
  scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(expression,value->{result[0]=value;done.countDown();}));
  assertTrue("WebView callback",done.await(10,TimeUnit.SECONDS));return result[0]==null||result[0].equals("null")?null:new JSONTokener(result[0]).nextValue();
 }
 private void waitFor(ActivityScenario<MainActivity> scenario,String expression)throws Exception{
  long end=SystemClock.uptimeMillis()+30000;
  while(SystemClock.uptimeMillis()<end){if(Boolean.TRUE.equals(js(scenario,expression)))return;SystemClock.sleep(150);}
  fail("Condition Android WebView non satisfaite : "+expression);
 }
 private void screenshot(String name)throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();File dir=new File(context.getExternalFilesDir(null),"phase11-proof");dir.mkdirs();
  Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,out));}
 }
 @Test public void launchRotationAndRestartUseBundledPortal()throws Exception{
  try(ActivityScenario<MainActivity> s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('#auth-signin-form')");
   assertEquals("https://localhost",js(s,"location.origin"));
   assertEquals("hxtztkmbfpmzrieccwsg",js(s,"MIRPortalConfig.projectRef"));
   assertEquals(Boolean.TRUE,js(s,"document.querySelector('[data-auth-screen=signup]').hidden"));
   assertEquals(Boolean.TRUE,js(s,"document.querySelector('#auth-google').hidden"));
   js(s,"document.querySelector('#auth-email').value='recette-phase11@example.invalid';localStorage.setItem('mir_phase11_probe','retained');true");
   screenshot("android-signin-portrait");
   s.onActivity(a->a.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
   waitFor(s,"innerWidth>innerHeight");assertEquals("recette-phase11@example.invalid",js(s,"document.querySelector('#auth-email').value"));screenshot("android-signin-landscape");
   s.recreate();waitFor(s,"!!document.querySelector('#auth-signin-form')");assertEquals("retained",js(s,"localStorage.getItem('mir_phase11_probe')"));
   assertEquals(Boolean.TRUE,js(s,"document.documentElement.scrollWidth<=innerWidth+2"));
  }
 }
 @Test public void nativeVaultEncryptsAndLogoutPurges()throws Exception{
  try(ActivityScenario<MainActivity> s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('#auth-signin-form')");
   js(s,"window.vaultProof='pending';MIRAndroid.Native.writeAuth({value:'RECETTE-PHASE11-VAULT'}).then(()=>MIRAndroid.Native.readAuth()).then(r=>window.vaultProof=r.value).catch(()=>window.vaultProof='failed');true");
   waitFor(s,"window.vaultProof==='RECETTE-PHASE11-VAULT'");
   Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();File file=new File(c.getNoBackupFilesDir(),"mir-auth.enc");assertTrue(file.exists());byte[] encrypted=java.nio.file.Files.readAllBytes(file.toPath());assertFalse(new String(encrypted,java.nio.charset.StandardCharsets.UTF_8).contains("RECETTE-PHASE11-VAULT"));
   js(s,"window.vaultProof='pending';MIRAndroid.Native.clearAuth().then(()=>MIRPortalActiveClient.signOut()).then(()=>window.vaultProof='cleared').catch(()=>window.vaultProof='failed');true");
   waitFor(s,"window.vaultProof==='cleared'");assertFalse(file.exists());assertEquals(null,js(s,"localStorage.getItem('mir_phase11_probe')"));
  }
 }
 @Test public void permissionsAndFileCancellationDoNotUpload()throws Exception{
  Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();
  android.app.UiAutomation automation=InstrumentationRegistry.getInstrumentation().getUiAutomation();
  UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('#auth-signin-form')");
   automation.revokeRuntimePermission(c.getPackageName(),android.Manifest.permission.CAMERA);
   js(s,"window.permissionProof='pending';MIRAndroid.Native.scanQr().then(()=>window.permissionProof='unexpected').catch(()=>window.permissionProof='denied');true");
   androidx.test.uiautomator.UiObject2 deny=device.wait(androidx.test.uiautomator.Until.findObject(androidx.test.uiautomator.By.res("com.android.permissioncontroller:id/permission_deny_button")),5000);assertNotNull("Permission demandée à l’usage",deny);deny.click();waitFor(s,"window.permissionProof==='denied'");screenshot("android-camera-denied");
   automation.grantRuntimePermission(c.getPackageName(),android.Manifest.permission.CAMERA);
   js(s,"window.permissionProof='pending';MIRAndroid.Native.scanQr().then(r=>window.permissionProof=r.cancelled?'cancelled':'scanned').catch(()=>window.permissionProof='failed');true");
   assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(androidx.test.uiautomator.By.text("Scanner le code MIR")),5000));screenshot("android-qr-scanner");device.pressBack();waitFor(s,"window.permissionProof==='cancelled'");
   js(s,"window.fileProof='pending';MIRAndroid.Native.pickFile().then(r=>window.fileProof=r.cancelled?'cancelled':'selected').catch(()=>window.fileProof='failed');true");
   assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(androidx.test.uiautomator.By.pkg("com.android.documentsui")),5000));device.pressBack();waitFor(s,"window.fileProof==='cancelled'");
  }
 }

 @Test public void realFourProfilePdfRendersPrivately()throws Exception{
  Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();File dir=new File(c.getCacheDir(),"mir-pdf");dir.mkdirs();String name="00000000-0000-4000-8000-000000000011-proof.pdf";File file=new File(dir,name);
  try(InputStream input=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("phase10-four.pdf");FileOutputStream output=new FileOutputStream(file)){input.transferTo(output);}
  assertTrue(file.length()>1000);
  try(ActivityScenario<MainActivity> s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('#auth-signin-form')");
   s.onActivity(a->a.getBridge().getWebView().loadUrl("https://localhost/native-pdf.html?id="+name));
   waitFor(s,"document.querySelectorAll('canvas').length===4 && document.querySelector('#status').textContent.startsWith('4 page')");
   screenshot("android-pdf-four-pages");
   js(s,"window.pdfProof='pending';MIRAndroid.Native.pdf({data:btoa('not a PDF'),name:'bad.pdf',action:'open'}).then(()=>window.pdfProof='incorrectly accepted').catch(()=>window.pdfProof='refused');true");
   waitFor(s,"window.pdfProof==='refused'");
  }finally{assertTrue(file.delete());}
 }
}
