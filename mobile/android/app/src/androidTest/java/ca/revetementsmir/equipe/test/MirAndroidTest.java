package ca.revetementsmir.equipe.test;

import android.content.Context;
import android.content.Intent;
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
 @org.junit.Rule public org.junit.rules.TestWatcher failureProof=new org.junit.rules.TestWatcher(){
  @Override protected void failed(Throwable error,org.junit.runner.Description description){try{screenshot("failed-"+description.getMethodName());Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).dumpWindowHierarchy(new File(c.getExternalFilesDir(null),"phase11-proof/failed-ui.xml"));}catch(Exception ignored){}}
 };
 private Object js(ActivityScenario<MainActivity> scenario,String expression)throws Exception{
  CountDownLatch done=new CountDownLatch(1);String[] result={null};
  scenario.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(expression,value->{result[0]=value;done.countDown();}));
  assertTrue("WebView callback",done.await(10,TimeUnit.SECONDS));return result[0]==null||result[0].equals("null")?null:new JSONTokener(result[0]).nextValue();
 }
 private void waitFor(ActivityScenario<MainActivity> scenario,String expression)throws Exception{
  long end=SystemClock.uptimeMillis()+30000;
  while(SystemClock.uptimeMillis()<end){if(Boolean.TRUE.equals(js(scenario,expression)))return;SystemClock.sleep(150);}
  screenshot("failed-wait");fail("Condition Android WebView non satisfaite : "+expression+"; état PDF="+js(scenario,"JSON.stringify({status:document.querySelector('#status')?.textContent,error:window.mirNativeDiagnostic,save:window.saveProof,visibility:document.visibilityState})"));
 }
 private void screenshot(String name)throws Exception{
  Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();File dir=new File(context.getExternalFilesDir(null),"phase11-proof");dir.mkdirs();
  Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);try(FileOutputStream out=new FileOutputStream(new File(dir,name+".png"))){assertTrue(bitmap.compress(Bitmap.CompressFormat.PNG,100,out));}
  int width=bitmap.getWidth()>bitmap.getHeight()?960:540;Bitmap small=Bitmap.createScaledBitmap(bitmap,width,Math.round(bitmap.getHeight()*(width/(float)bitmap.getWidth())),true);try(FileOutputStream out=new FileOutputStream(new File(dir,name+"-scaled.png"))){assertTrue(small.compress(Bitmap.CompressFormat.PNG,100,out));}small.recycle();bitmap.recycle();
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
   js(s,"MIRHarmonySettings.store({theme:'dark',textSize:'large',reducedMotion:'on',highContrast:true});true");
   assertEquals("dark",js(s,"document.documentElement.dataset.mirTheme"));assertEquals("large",js(s,"document.documentElement.dataset.mirText"));assertEquals("reduced",js(s,"document.documentElement.dataset.mirMotion"));assertEquals("high",js(s,"document.documentElement.dataset.mirContrast"));assertEquals(Boolean.TRUE,js(s,"document.documentElement.scrollWidth<=innerWidth+2"));screenshot("android-dark-large-contrast");
   s.onActivity(a->a.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
   waitFor(s,"innerWidth>innerHeight");assertEquals("recette-phase11@example.invalid",js(s,"document.querySelector('#auth-email').value"));screenshot("android-signin-landscape");
   s.recreate();waitFor(s,"!!document.querySelector('#auth-signin-form')");assertEquals("retained",js(s,"localStorage.getItem('mir_phase11_probe')"));
   assertEquals(Boolean.TRUE,js(s,"document.documentElement.scrollWidth<=innerWidth+2"));
   s.onActivity(a->a.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));waitFor(s,"innerHeight>innerWidth");
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
 @Test public void backKeyboardOfflineAndResumePreserveLocalInput()throws Exception{
  UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('#auth-signin-form')");
   js(s,"document.body.insertAdjacentHTML('beforeend','<form id=android-recipe-form><label>Brouillon local de recette<textarea id=android-recipe-input></textarea></label></form>');let field=document.querySelector('#android-recipe-input');field.value='RECETTE-PHASE11-LOCAL';field.focus();field.scrollIntoView({block:'center'});field.dispatchEvent(new Event('input',{bubbles:true}));true");
   s.onActivity(a->{a.getBridge().getWebView().requestFocus();((android.view.inputmethod.InputMethodManager)a.getSystemService(Context.INPUT_METHOD_SERVICE)).showSoftInput(a.getBridge().getWebView(),android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);});
   long end=SystemClock.uptimeMillis()+5000;java.util.concurrent.atomic.AtomicBoolean keyboard=new java.util.concurrent.atomic.AtomicBoolean(false);
   while(SystemClock.uptimeMillis()<end){s.onActivity(a->{androidx.core.view.WindowInsetsCompat insets=androidx.core.view.ViewCompat.getRootWindowInsets(a.getBridge().getWebView());keyboard.set(insets!=null&&insets.isVisible(androidx.core.view.WindowInsetsCompat.Type.ime()));});if(keyboard.get())break;SystemClock.sleep(100);}
   assertTrue("Clavier Android visible",keyboard.get());screenshot("android-keyboard");
   waitFor(s,"document.querySelector('#android-recipe-input').getBoundingClientRect().bottom<=innerHeight");
   device.pressBack();device.pressBack();
   androidx.test.uiautomator.UiObject2 cancel=device.wait(androidx.test.uiautomator.Until.findObject(androidx.test.uiautomator.By.res("android:id/button2")),5000);assertNotNull("Confirmation avant abandon",cancel);cancel.click();assertEquals("RECETTE-PHASE11-LOCAL",js(s,"document.querySelector('#android-recipe-input').value"));
   device.pressHome();Context target=InstrumentationRegistry.getInstrumentation().getTargetContext();Intent intent=target.getPackageManager().getLaunchIntentForPackage(target.getPackageName());intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_SINGLE_TOP);target.startActivity(intent);waitFor(s,"document.visibilityState==='visible'");assertEquals("RECETTE-PHASE11-LOCAL",js(s,"document.querySelector('#android-recipe-input').value"));
   try{device.executeShellCommand("svc wifi disable");device.executeShellCommand("svc data disable");waitFor(s,"document.querySelector('#mir-native-state').textContent.includes('Hors ligne')");screenshot("android-offline");}
   finally{device.executeShellCommand("svc wifi enable");device.executeShellCommand("svc data enable");}
   waitFor(s,"document.querySelector('#mir-native-state').textContent.includes('actualisation')");assertEquals("RECETTE-PHASE11-LOCAL",js(s,"document.querySelector('#android-recipe-input').value"));
  }
 }
 @Test public void permissionsAndFileCancellationDoNotUpload()throws Exception{
  Context c=InstrumentationRegistry.getInstrumentation().getTargetContext();
  android.app.UiAutomation automation=InstrumentationRegistry.getInstrumentation().getUiAutomation();
  UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  try(ActivityScenario<MainActivity>s=ActivityScenario.launch(MainActivity.class)){
   waitFor(s,"!!document.querySelector('#auth-signin-form')");
   automation.revokeRuntimePermission(c.getPackageName(),android.Manifest.permission.CAMERA);
   js(s,"window.permissionProof='pending';MIRAndroid.Native.scanQr().then(()=>window.permissionProof='unexpected').catch(e=>{window.permissionError=e.message;window.permissionProof='denied';});true");
   // The resource name is fixed; AOSP and Google images use different system packages.
   androidx.test.uiautomator.UiObject2 deny=device.wait(androidx.test.uiautomator.Until.findObject(androidx.test.uiautomator.By.res(java.util.regex.Pattern.compile("(?:com\\.android|com\\.google\\.android)\\.permissioncontroller:id/permission_deny_button"))),5000);screenshot("permission-before-check");device.dumpWindowHierarchy(new File(c.getExternalFilesDir(null),"phase11-proof/permission-ui.xml"));assertNotNull("Permission demandée à l’usage; état="+js(s,"window.permissionProof+' '+window.permissionError"),deny);deny.click();waitFor(s,"window.permissionProof==='denied'");screenshot("android-camera-denied");
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
   assertEquals(Boolean.TRUE,js(s,"[...document.querySelectorAll('canvas')].every(canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let ink=0;for(let i=0;i<data.length;i+=4)if(data[i+3]&&data[i]<200&&data[i+1]<200&&data[i+2]<200)ink++;return ink>100;})"));
   screenshot("android-pdf-four-pages");
   byte[] original=java.security.MessageDigest.getInstance("SHA-256").digest(java.nio.file.Files.readAllBytes(file.toPath()));
   js(s,"window.saveProof='pending';MIRAndroid.Native.readPdf({id:'"+name+"'}).then(r=>MIRAndroid.Native.pdf({data:r.data,name:'RECETTE-PHASE11.pdf',action:'save'})).then(r=>window.saveProof=r.cancelled?'cancelled':'unexpected').catch(()=>window.saveProof='failed');true");
   UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());assertTrue(device.wait(androidx.test.uiautomator.Until.hasObject(androidx.test.uiautomator.By.pkg("com.android.documentsui")),5000));screenshot("android-pdf-save-chooser");device.pressBack();
   // The first Back can dismiss the filename keyboard; cancel the still-open picker.
   if(!device.wait(androidx.test.uiautomator.Until.gone(androidx.test.uiautomator.By.pkg("com.android.documentsui")),1000))device.pressBack();
   waitFor(s,"window.saveProof==='cancelled'");
   assertArrayEquals(original,java.security.MessageDigest.getInstance("SHA-256").digest(java.nio.file.Files.readAllBytes(file.toPath())));
   js(s,"window.pdfProof='pending';MIRAndroid.Native.pdf({data:btoa('not a PDF'),name:'bad.pdf',action:'open'}).then(()=>window.pdfProof='incorrectly accepted').catch(()=>window.pdfProof='refused');true");
   waitFor(s,"window.pdfProof==='refused'");
  }finally{assertTrue(file.delete());}
 }
}
