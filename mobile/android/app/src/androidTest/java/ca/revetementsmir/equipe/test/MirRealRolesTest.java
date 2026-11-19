package ca.revetementsmir.equipe.test;
import android.content.Context;
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
 /** Exact run-scoped MIR TEST fixture, injected into private app storage only by
  * the trusted CI runner after backend confirmation. No client-side parameter. */
 private JSONObject nativeQaFixture() throws Exception{
  File file=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getFilesDir(),"native-qa-run-manifest.json");
  assertTrue("MIR TEST private run manifest required",file.isFile());
  JSONObject fixture=new JSONObject(new String(java.nio.file.Files.readAllBytes(file.toPath()),java.nio.charset.StandardCharsets.UTF_8));
  assertEquals("MIR TEST only","hxtztkmbfpmzrieccwsg",fixture.getString("projectRef"));
  assertEquals("Server-confirmed active fixture","active",fixture.getString("state"));
  String runId=fixture.getString("runId");
  assertTrue("Fresh UUIDv4 run ID",runId.matches("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"));
  assertEquals("One run-specific marker","QA-NATIVE-RUN-"+runId.replace("-",""),fixture.getString("marker"));
  assertEquals("Correct UTC work day",java.time.LocalDate.now(java.time.ZoneOffset.UTC).toString(),fixture.getString("workDate"));
  assertEquals("Approved QA job","7da20261-1114-4000-8000-000000000001",fixture.getString("jobId"));
  JSONObject employee=fixture.getJSONObject("employee"),chef=fixture.getJSONObject("chef");
  assertEquals("QA employee identity","3980647a-d83a-48ad-9d90-8fc2b314807f",employee.getString("id"));
  assertEquals("QA chef identity","ec421778-b39b-492e-9e4b-5e044015e98f",chef.getString("id"));
  for(String key:new String[]{"shift","segment"}){
   assertTrue("Distinct employee "+key,employee.getString(key).matches("[0-9a-f-]{36}"));
   assertTrue("Distinct chef "+key,chef.getString(key).matches("[0-9a-f-]{36}"));
   assertNotEquals("Run must not reuse "+key,employee.getString(key),chef.getString(key));
  }
  return fixture;
 }
 private Object js(ActivityScenario<MainActivity>s,String expression)throws Exception{
  CountDownLatch done=new CountDownLatch(1);String[] value={null};
  String body=expression.endsWith(";true")?expression.substring(0,expression.length()-4)+"return true;":"return ("+expression+");";
  String script="(()=>{try{return {ok:true,value:(()=>{"+body+"})()};}catch(e){return {ok:false,error:e.message};}})()";
  s.onActivity(a->a.getBridge().getWebView().evaluateJavascript(script,r->{value[0]=r;done.countDown();}));assertTrue(done.await(10,TimeUnit.SECONDS));
  assertNotNull("JavaScript test returned no result",value[0]);JSONObject result=new JSONObject(value[0]);if(!result.getBoolean("ok")){failWithScreenshot("failed-real-roles-js","JavaScript test: "+result.optString("error"));}
  Object resultValue=result.opt("value");return resultValue==JSONObject.NULL?null:resultValue;
 }
 private void waitFor(ActivityScenario<MainActivity>s,String expression)throws Exception{waitFor(s,"condition",expression);}
 private void waitFor(ActivityScenario<MainActivity>s,String step,String expression)throws Exception{long end=SystemClock.uptimeMillis()+30000;while(SystemClock.uptimeMillis()<end){if(Boolean.TRUE.equals(js(s,expression)))return;SystemClock.sleep(150);}js(s,"window.nativeAuthDiagnostic={status:'requested'};if(window.MIRAndroidSession?.diagnostic)window.MIRAndroidSession.diagnostic().then(value=>window.nativeAuthDiagnostic=value).catch(()=>window.nativeAuthDiagnostic={status:'failed'});else navigator.locks?.query().then(value=>window.nativeAuthDiagnostic={locks:value});true");long diagnosticEnd=SystemClock.uptimeMillis()+1500;while(SystemClock.uptimeMillis()<diagnosticEnd&&Boolean.TRUE.equals(js(s,"window.nativeAuthDiagnostic?.status==='requested'")))SystemClock.sleep(50);failWithScreenshot("failed-real-roles","MIR TEST Android : étape non confirmée "+step+"; état="+js(s,"JSON.stringify({proof:window.realProof,code:window.realProofCode,view:document.body.dataset.fieldView,heading:document.querySelector('#portal-content h1')?.textContent,sheetOpen:!!document.querySelector('.mir-choice-sheet[open]'),selectedHome:document.querySelector('[data-field-home-job]')?.value,homeLabel:document.querySelector('[data-field-home-job]')?.nextElementSibling?.textContent,homeAddress:document.querySelector('.field-job-address')?.textContent,selection:window.getSelection()?.toString().slice(0,80),phase:window.MIRPortalActiveClient?.getStatus().phase,error:window.MIRPortalActiveClient?.getStatus().error?.code,online:navigator.onLine,project:window.MIRPortalConfig?.projectRef,roleIndex:window.realRoleIndex,expectedRole:window.realExpectedRole,authDiagnostic:window.nativeAuthDiagnostic,lastTap:window.nativeLastTap,drawing:(()=>{const f=document.querySelector('#field-drawing-frame');if(!f)return null;try{const d=f.contentDocument,w=f.contentWindow,p=d?.querySelector('#client-draw-profile'),t=d?.querySelector('#trace-height'),b=t?.nextElementSibling;return{route:new URL(f.src).pathname,ready:d?.readyState,sameFrame:f===window.nativeDrawingFrame,sameDocument:d===window.nativeDrawingDocument,entry:d?.body?.dataset.clientEntry,profilePresent:!!p,profileDisabled:p?.disabled,profileVisible:!!p?.getClientRects().length,tracePresent:!!t,traceValue:t?.value,triggerPresent:!!b,triggerVisible:!!b?.getClientRects().length,choicesPresent:!!w?.MIRFieldChoices,choiceOpen:w?.MIRFieldChoices?.isOpen(),activeTag:d?.activeElement?.tagName,activeId:d?.activeElement?.id,activeClass:d?.activeElement?.className,sourceFocused:d?.activeElement===b};}catch(e){return{error:e.message};}})()})"));}
 private final java.util.Map<String,JSONObject> nativeProofs=new java.util.LinkedHashMap<>();
 private File proofDirectory(){File dir=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"phase11-proof");assertTrue(dir.isDirectory()||dir.mkdirs());return dir;}
 private static String hex(byte[] bytes){StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();}
 private android.graphics.Rect fixedHeader;
 private final java.util.Set<String> headerHashes=new java.util.HashSet<>();
 private final java.util.List<android.graphics.Rect> dynamicRegions=new java.util.ArrayList<>();
 private String pixelHash(android.graphics.Bitmap bitmap,android.graphics.Rect area)throws Exception{return pixelHash(bitmap,area,true);}
 private String pixelHash(android.graphics.Bitmap bitmap,android.graphics.Rect area,boolean maskClock)throws Exception{
  assertTrue("Screenshot content crop within real display",area.left>=0&&area.top>=0&&area.right<=bitmap.getWidth()&&area.bottom<=bitmap.getHeight()&&area.width()>0&&area.height()>0);
  android.graphics.Bitmap readable=bitmap.getConfig()==android.graphics.Bitmap.Config.HARDWARE?bitmap.copy(android.graphics.Bitmap.Config.ARGB_8888,false):bitmap;assertNotNull(readable);
  try{java.security.MessageDigest digest=java.security.MessageDigest.getInstance("SHA-256");int[] row=new int[area.width()];java.nio.ByteBuffer bytes=java.nio.ByteBuffer.allocate(row.length*4);
   for(int y=area.top;y<area.bottom;y++){readable.getPixels(row,0,row.length,area.left,y,row.length,1);if(maskClock)for(android.graphics.Rect r:dynamicRegions)if(y>=r.top&&y<r.bottom)for(int x=Math.max(area.left,r.left);x<Math.min(area.right,r.right);x++)row[x-area.left]=0;bytes.clear();bytes.asIntBuffer().put(row);digest.update(bytes.array());}return hex(digest.digest());
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
  if(content!=null){assertNotNull("Fixed content header is measured",fixedHeader);proof.put("headerSha256",pixelHash(bitmap,fixedHeader,false)).put("headerCrop",new JSONObject().put("left",fixedHeader.left).put("top",fixedHeader.top).put("right",fixedHeader.right).put("bottom",fixedHeader.bottom));JSONArray masks=new JSONArray();for(android.graphics.Rect r:dynamicRegions)masks.put(new JSONObject().put("left",r.left).put("top",r.top).put("right",r.right).put("bottom",r.bottom));proof.put("dynamicRegions",masks).put("rawContentSha256",pixelHash(bitmap,content,false)).put("contentSha256",pixelHash(bitmap,content)).put("crop",new JSONObject().put("left",content.left).put("top",content.top).put("right",content.right).put("bottom",content.bottom));}nativeProofs.put(name,proof);return proof;
 }
 private JSONObject screenshot(ActivityScenario<MainActivity>s,String name)throws Exception{presentFrame(s);return screenshotSystem(name);}
 private JSONObject screenshotSystem(String name)throws Exception{
  androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).waitForIdle(1000);
  android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);try{return saveScreenshot(name,bitmap,null);}finally{bitmap.recycle();}
 }
 private void failWithScreenshot(String label,String message){
  AssertionError failure=new AssertionError(message);
  try{
   // Cleanup can expose a second failure. Keep both captures and the original
   // assertion rather than replacing it with an evidence filename collision.
   String name=label;int suffix=2;
   while(new File(proofDirectory(),name+".png").exists())name=label+"-"+(suffix++);
   screenshotSystem(name);
  }catch(AssertionError|Exception captureFailure){failure.addSuppressed(captureFailure);}
  throw failure;
 }
 private boolean injectDeliberateNativeTap(int x,int y){
  // Use an actual finger tool, not obtain(x,y)'s TOOL_TYPE_UNKNOWN. The latter
  // reached Chromium with an empty pointerType in the failed Punch close proof.
  // One short native press/release only: no DOM click and no retry on failure.
  final android.app.UiAutomation automation=InstrumentationRegistry.getInstrumentation().getUiAutomation();
  final android.view.MotionEvent.PointerProperties finger=new android.view.MotionEvent.PointerProperties();
  finger.id=0;finger.toolType=android.view.MotionEvent.TOOL_TYPE_FINGER;
  final android.view.MotionEvent.PointerCoords contact=new android.view.MotionEvent.PointerCoords();
  contact.x=x;contact.y=y;contact.pressure=1f;contact.size=1f;
  final android.view.MotionEvent.PointerProperties[] fingers={finger};
  final android.view.MotionEvent.PointerCoords[] contacts={contact};
  final long downTime=SystemClock.uptimeMillis();
  final android.view.MotionEvent down=android.view.MotionEvent.obtain(downTime,downTime,
      android.view.MotionEvent.ACTION_DOWN,1,fingers,contacts,0,0,1f,1f,0,0,
      android.view.InputDevice.SOURCE_TOUCHSCREEN,0);
  boolean downDelivered;
  try{downDelivered=automation.injectInputEvent(down,true);}finally{down.recycle();}
  if(!downDelivered)return false;
  SystemClock.sleep(50);
  contact.pressure=0f;
  final android.view.MotionEvent up=android.view.MotionEvent.obtain(downTime,SystemClock.uptimeMillis(),
      android.view.MotionEvent.ACTION_UP,1,fingers,contacts,0,0,1f,1f,0,0,
      android.view.InputDevice.SOURCE_TOUCHSCREEN,0);
  try{return automation.injectInputEvent(up,true);}finally{up.recycle();}
 }
 private void tap(ActivityScenario<MainActivity>s,String selector)throws Exception{
  // Native pointer input: no programmatic DOM click that can precede presentation.
  waitFor(s,"(()=>{const n=document.querySelector("+JSONObject.quote(selector)+");return !!n&&!n.disabled&&n.getBoundingClientRect().height>0;})()");js(s,"document.querySelector("+JSONObject.quote(selector)+").scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});true");presentFrame(s);
  JSONObject point=(JSONObject)js(s,"(()=>{const n=document.querySelector("+JSONObject.quote(selector)+");if(!n)throw Error('Native target missing');const r=n.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return{x,y,width:innerWidth,height:innerHeight,w:r.width,h:r.height,hit:!!hit&&(hit===n||n.contains(hit))};})()");assertTrue("Native target is presented without an intercepting element",point.getBoolean("hit"));
  assertTrue("Native target has visible bounds",point.getDouble("w")>0&&point.getDouble("h")>0&&point.getDouble("x")>=0&&point.getDouble("y")>=0&&point.getDouble("x")<point.getDouble("width")&&point.getDouble("y")<point.getDouble("height"));int[] loc=new int[4];s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.getLocationOnScreen(loc);loc[2]=web.getWidth();loc[3]=web.getHeight();});
  // CSS pixels have the same physical scale on both axes, even when viewport height changes.
  double scale=loc[2]/point.getDouble("width");int x=loc[0]+(int)Math.round(point.getDouble("x")*scale),y=loc[1]+(int)Math.round(point.getDouble("y")*scale);
  js(s,"(()=>{window.nativeLastTap={selector:"+JSONObject.quote(selector)+",point:"+point.toString()+",screenX:"+x+",screenY:"+y+",webLeft:"+loc[0]+",webTop:"+loc[1]+",webWidth:"+loc[2]+",webHeight:"+loc[3]+",events:[]};window.nativeTapTarget=document.querySelector(window.nativeLastTap.selector);if(!window.nativeTapProbe){window.nativeTapProbe=true;for(const type of ['pointerdown','pointerup','pointercancel','touchstart','touchend','mousedown','mouseup','click','contextmenu'])document.addEventListener(type,e=>{const tap=window.nativeLastTap;if(!tap)return;const target=window.nativeTapTarget,rect=target?.getBoundingClientRect(),sample={type,x:e.clientX,y:e.clientY,target:e.target.tagName,close:!!e.target.closest('[data-close-dialog]'),timeStamp:e.timeStamp,observedAt:performance.now(),isTrusted:e.isTrusted,defaultPrevented:e.defaultPrevented,pointerId:e.pointerId,pointerType:e.pointerType,isPrimary:e.isPrimary,button:e.button,buttons:e.buttons,pressure:e.pressure,sameInitialTarget:e.target===target,insideInitialTarget:!!target?.contains(e.target),initialTargetConnected:!!target?.isConnected,currentSelectorIsInitial:document.querySelector(tap.selector)===target,rect:rect?.toJSON()};if(type==='pointerdown')tap.downTimeStamp=e.timeStamp;if(type==='pointerup')sample.downToUpMs=e.timeStamp-tap.downTimeStamp;tap.events.push(sample);setTimeout(()=>{sample.defaultPreventedAfterDispatch=e.defaultPrevented;},0);},true);}return true;})()");
  final boolean closeButton=selector.equals("#portal-dialog .dialog-close[data-close-dialog]");
  assertTrue("Native tap delivered",closeButton?injectDeliberateNativeTap(x,y):
      androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).click(x,y));
  if(closeButton){
    // Verify the real touchscreen sequence and the actual <dialog> closure.
    // A long press, cancellation or programmatic click cannot pass this gate.
    waitFor(s,"native click closes portal dialog: "+js(s,"JSON.stringify(window.nativeLastTap)"),
        "['pointerdown','pointerup'].every(type=>window.nativeLastTap.events.some(e=>e.type===type&&e.pointerType==='touch'&&e.isTrusted&&e.sameInitialTarget)) && window.nativeLastTap.events.some(e=>e.type==='click'&&e.close&&e.isTrusted) && !window.nativeLastTap.events.some(e=>e.type==='pointercancel'||e.type==='contextmenu') && document.querySelector('#portal-dialog')?.open===false");
  }
 }
 private String drawingTargetExpression(String selector){
  return "(()=>{const f=document.querySelector('#field-drawing-frame'),d=f?.contentDocument,n=d?.querySelector("+JSONObject.quote(selector)+");if(!f||!d||!n||!n.isConnected||n.matches(':disabled'))return{ready:false};const r=n.getBoundingClientRect(),frame=f.getBoundingClientRect();if(f.offsetWidth<=0||f.offsetHeight<=0||frame.width<=0||frame.height<=0)return{ready:false};const cx=r.left+r.width/2,cy=r.top+r.height/2,sx=frame.width/f.offsetWidth,sy=frame.height/f.offsetHeight,x=frame.left+(f.clientLeft+cx)*sx,y=frame.top+(f.clientTop+cy)*sy,hit=d.elementFromPoint(cx,cy),parentHit=document.elementFromPoint(x,y);return{ready:r.width>0&&r.height>0&&cx>=0&&cy>=0&&cx<f.contentWindow.innerWidth&&cy<f.contentWindow.innerHeight&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&!!hit&&(hit===n||n.contains(hit))&&parentHit===f,x,y,width:innerWidth,height:innerHeight,w:r.width,h:r.height,frameLeft:frame.left,frameTop:frame.top,frameWidth:frame.width,frameHeight:frame.height,childWidth:f.contentWindow.innerWidth,childHeight:f.contentWindow.innerHeight,childHit:!!hit&&(hit===n||n.contains(hit)),parentHit:parentHit===f};})()";
 }
 private JSONObject stableDrawingTarget(ActivityScenario<MainActivity>s,String selector,int[] nativeLocation)throws Exception{
  return stableDrawingTargetProbe(s,selector,drawingTargetExpression(selector),nativeLocation);
 }
 private JSONObject stableDrawingTargetProbe(ActivityScenario<MainActivity>s,String label,String expression,int[] nativeLocation)throws Exception{
  long deadline=SystemClock.uptimeMillis()+30000;JSONObject anchor=null,last=null;int[] anchorNative=null;int stableSamples=0;
  while(SystemClock.uptimeMillis()<deadline){
   JSONObject point=(JSONObject)js(s,expression);last=point;
   int[] bounds=new int[7];s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.getLocationOnScreen(bounds);bounds[2]=web.getWidth();bounds[3]=web.getHeight();androidx.core.view.WindowInsetsCompat insets=androidx.core.view.ViewCompat.getRootWindowInsets(web);bounds[4]=insets==null?0:insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime()).bottom;bounds[5]=insets!=null&&insets.isVisible(androidx.core.view.WindowInsetsCompat.Type.ime())?1:0;bounds[6]=web.isShown()&&web.hasWindowFocus()?1:0;});
   if(point.getBoolean("ready")&&bounds[2]>0&&bounds[3]>0&&bounds[6]==1){
    boolean same=anchor!=null&&java.util.Arrays.equals(anchorNative,bounds);
    if(same)for(String key:new String[]{"x","y","w","h","width","height","frameLeft","frameTop","frameWidth","frameHeight","childWidth","childHeight"})if(Math.abs(point.getDouble(key)-anchor.getDouble(key))>.25){same=false;break;}
    // Compare to the first sample, not only the preceding one: slow movement
    // must not accumulate into a supposedly stable native tap location.
    if(same)stableSamples++;else{anchor=point;anchorNative=bounds;stableSamples=1;}
    if(stableSamples>=3){System.arraycopy(bounds,0,nativeLocation,0,4);return point;}
   }else{anchor=null;anchorNative=null;stableSamples=0;}
   SystemClock.sleep(150);
  }
  throw new AssertionError("Drawing target did not remain presented and stable: "+label+"; last sample="+last);
 }
 private String drawingGridTargetExpression(double xInches,double yInches)throws JSONException{
  // Read the rendered grid, never the private drawTransform or an app mutation
  // seam. Its major square is one inch (10 mm in metric). getScreenCTM handles
  // both the compact viewBox and the enlarged canvas, including letterboxing.
  return "(()=>{const inches="+new JSONArray().put(xInches).put(yInches).toString()+";"+"""
   const f=document.querySelector('#field-drawing-frame'),d=f?.contentDocument,w=f?.contentWindow,n=d?.querySelector('#production-drawing svg'),grid=n?.querySelector('#mir-trace-major'),state=w?.MIRProductionWorkspace?.getLivePreviewState();
   if(!f||!d||!n?.isConnected||!grid||state?.tool!=='draw')return {ready:false};
   const frame=f.getBoundingClientRect(),r=n.getBoundingClientRect(),matrix=n.getScreenCTM(),unit=state.model?.unit;
   if(!matrix||!['in','mm'].includes(unit)||f.offsetWidth<=0||f.offsetHeight<=0||frame.width<=0||frame.height<=0)return {ready:false};
   const major=Number(grid.getAttribute('width')),ox=Number(grid.getAttribute('x')),oy=Number(grid.getAttribute('y')),unitsPerInch=unit==='mm'?25.4/10:1;
   if(!Number.isFinite(major)||major<=0||!Number.isFinite(ox)||!Number.isFinite(oy))return {ready:false};
   const p=n.createSVGPoint();p.x=ox+inches[0]*major*unitsPerInch;p.y=oy-inches[1]*major*unitsPerInch;
   const mapped=p.matrixTransform(matrix),cx=mapped.x,cy=mapped.y,sx=frame.width/f.offsetWidth,sy=frame.height/f.offsetHeight,x=frame.left+(f.clientLeft+cx)*sx,y=frame.top+(f.clientTop+cy)*sy;
   const hit=d.elementFromPoint(cx,cy),parentHit=document.elementFromPoint(x,y),childHit=!!hit&&(hit===n||n.contains(hit));
   return {ready:r.width>0&&r.height>0&&cx>=r.left&&cy>=r.top&&cx<r.right&&cy<r.bottom&&cx>=0&&cy>=0&&cx<w.innerWidth&&cy<w.innerHeight&&x>=0&&y>=0&&x<innerWidth&&y<innerHeight&&childHit&&parentHit===f,x,y,width:innerWidth,height:innerHeight,w:r.width,h:r.height,frameLeft:frame.left,frameTop:frame.top,frameWidth:frame.width,frameHeight:frame.height,childWidth:w.innerWidth,childHeight:w.innerHeight,childHit,parentHit:parentHit===f,childX:cx,childY:cy,svgX:p.x,svgY:p.y,unit,major,requestedInches:inches};
   })()
   """;
 }
 private JSONObject tapDrawingGrid(ActivityScenario<MainActivity>s,double xInches,double yInches)throws Exception{
  final String selector="#production-drawing svg",label="grid "+xInches+", "+yInches+" in";int sequence=++drawingTapSequence;
  try{
   waitFor(s,"drawing grid is available","!!document.querySelector('#field-drawing-frame')?.contentDocument.querySelector('#production-drawing svg #mir-trace-major')");
   js(s,"document.querySelector('#field-drawing-frame').contentDocument.querySelector('#production-drawing').scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});true");
   presentFrame(s);
   int[] loc=new int[4];JSONObject point=stableDrawingTargetProbe(s,label,drawingGridTargetExpression(xInches,yInches),loc);
   assertTrue("Native grid point is presented and unobstructed",point.getBoolean("ready"));
   js(s,"""
    (()=>{const f=document.querySelector('#field-drawing-frame'),w=f.contentWindow,d=f.contentDocument;w.nativeGridTapEvents=[];
     if(!w.nativeGridTapObserver){w.nativeGridTapObserver=true;for(const type of ['pointerdown','pointerup','pointercancel','contextmenu'])d.addEventListener(type,event=>{if(!d.querySelector('#production-drawing')?.contains(event.target))return;w.nativeGridTapEvents.push({type:event.type,pointerType:event.pointerType,isTrusted:event.isTrusted,x:event.clientX,y:event.clientY});},true);}
     return true;})()
    """);
   double physicalScale=loc[2]/point.getDouble("width");int x=loc[0]+(int)Math.round(point.getDouble("x")*physicalScale),y=loc[1]+(int)Math.round(point.getDouble("y")*physicalScale);
   assertTrue("Native touchscreen drawing tap delivered",injectDeliberateNativeTap(x,y));
   waitFor(s,"trusted touchscreen reached the drawing grid","(()=>{const events=document.querySelector('#field-drawing-frame').contentWindow.nativeGridTapEvents;return ['pointerdown','pointerup'].every(type=>events.some(event=>event.type===type&&event.pointerType==='touch'&&event.isTrusted))&&!events.some(event=>event.type==='pointercancel'||event.type==='contextmenu');})()");
   point.put("events",js(s,"document.querySelector('#field-drawing-frame').contentWindow.nativeGridTapEvents")).put("screenX",x).put("screenY",y).put("input","UiAutomation touchscreen finger");return point;
  }catch(AssertionError|Exception failure){
   try{JSONObject diagnostic=writeDrawingTapDiagnostic(s,selector,sequence,"failed",true);diagnostic.put("requestedInches",new JSONArray().put(xInches).put(yInches)).put("gridTarget",js(s,drawingGridTargetExpression(xInches,yInches)));failure.addSuppressed(new AssertionError("Native grid tap evidence="+diagnostic.toString()));}catch(AssertionError|Exception diagnosticFailure){failure.addSuppressed(diagnosticFailure);}throw failure;
  }
 }
 private int drawingTapSequence=0,compactTracePointIndex=0;
 private JSONObject writeDrawingTapDiagnostic(ActivityScenario<MainActivity>s,String selector,int sequence,String phase,boolean capture)throws Exception{
  JSONObject proof=(JSONObject)js(s,"(()=>{const targetGate="+drawingTargetExpression(selector)+",selector="+JSONObject.quote(selector)+";"+"""
   const f=document.querySelector('#field-drawing-frame'),d=f?.contentDocument,w=f?.contentWindow,n=d?.querySelector(selector);
   const identity=node=>node?{tag:node.tagName,id:node.id||'',classes:node.getAttribute?.('class')||''}:null;
   const describe=node=>{if(!node)return null;const style=node.ownerDocument.defaultView.getComputedStyle(node);return{...identity(node),rect:node.getBoundingClientRect().toJSON(),scrollTop:node.scrollTop,scrollLeft:node.scrollLeft,scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,scrollWidth:node.scrollWidth,clientWidth:node.clientWidth,overflow:style.overflow,overflowY:style.overflowY,height:style.height,minHeight:style.minHeight,maxHeight:style.maxHeight,position:style.position};};
   const viewport=win=>win?{width:win.innerWidth,height:win.innerHeight,scrollX:win.scrollX,scrollY:win.scrollY,visualViewport:win.visualViewport?{width:win.visualViewport.width,height:win.visualViewport.height,offsetTop:win.visualViewport.offsetTop,offsetLeft:win.visualViewport.offsetLeft,scale:win.visualViewport.scale}:null}:null;
   const r=n?.getBoundingClientRect(),cx=r?r.left+r.width/2:null,cy=r?r.top+r.height/2:null,childHit=r?d.elementFromPoint(cx,cy):null,parentHit=Number.isFinite(targetGate.x)&&Number.isFinite(targetGate.y)?document.elementFromPoint(targetGate.x,targetGate.y):null;
   return{selector,targetGate,stage:d?.body?.dataset.clientStage||'',entry:d?.body?.dataset.clientEntry||'',drawPointCount:w?.MIRProductionWorkspace?.getLivePreviewState?.()?.drawPointsMM?.length??null,gridTapEvents:w?.nativeGridTapEvents||[],active:identity(d?.activeElement),targetFocused:n===d?.activeElement,target:describe(n),childCenter:{x:cx,y:cy},childHit:identity(childHit),parentHit:identity(parentHit),parentViewport:viewport(window),childViewport:viewport(w),frame:describe(f),parentWrappers:['html','body','#portal-main','.mir-app-drawing','#portal-navigation'].map(q=>({selector:q,node:describe(document.querySelector(q))})),childWrappers:['html','body','.production-workspace','#production-preview','#drawing-tools','#client-step-scroll','#field-trace-toolbar','#field-trace-expand'].map(q=>({selector:q,node:describe(d?.querySelector(q))}))};
   })()
   """);
  int[] nativeBounds=new int[7];float[] font={0};s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.getLocationOnScreen(nativeBounds);nativeBounds[2]=web.getWidth();nativeBounds[3]=web.getHeight();nativeBounds[4]=web.getSettings().getTextZoom();nativeBounds[5]=a.getResources().getDisplayMetrics().densityDpi;font[0]=a.getResources().getConfiguration().fontScale;androidx.core.view.WindowInsetsCompat insets=androidx.core.view.ViewCompat.getRootWindowInsets(web);nativeBounds[6]=insets==null?0:insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime()).bottom;});
  proof.put("sequence",sequence).put("phase",phase).put("tracePointIndex",compactTracePointIndex).put("physicalDevice",false).put("keyboardVisible",drawingKeyboardVisible(s)).put("imeBottomPx",nativeBounds[6]).put("fontScale",font[0]).put("textZoom",nativeBounds[4]).put("densityDpi",nativeBounds[5]).put("webView",new JSONObject().put("left",nativeBounds[0]).put("top",nativeBounds[1]).put("width",nativeBounds[2]).put("height",nativeBounds[3]));
  String name=String.format(java.util.Locale.ROOT,"drawing-tap-%03d-%s",sequence,phase);
  // Diagnostic reads add no wait, scroll, focus or replacement input action.
  if(capture){android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);try{proof.put("screenshot",saveScreenshot(name,bitmap,null));}finally{bitmap.recycle();}}
  File file=new File(proofDirectory(),name+".json");assertFalse("Never overwrite drawing tap diagnostic",file.exists());java.nio.file.Files.write(file.toPath(),proof.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));return proof;
 }
 private void tapDrawing(ActivityScenario<MainActivity>s,String selector)throws Exception{
  int sequence=++drawingTapSequence;
  try{
  waitFor(s,"drawing target enabled "+selector,"(()=>{const n=document.querySelector('#field-drawing-frame')?.contentDocument?.querySelector("+JSONObject.quote(selector)+");return !!n&&n.isConnected&&!n.matches(':disabled')&&n.getBoundingClientRect().height>0;})()");
  writeDrawingTapDiagnostic(s,selector,sequence,"before-scroll",false);
  js(s,"document.querySelector('#field-drawing-frame').contentDocument.querySelector("+JSONObject.quote(selector)+").scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});true");
  presentFrame(s);
  writeDrawingTapDiagnostic(s,selector,sequence,"before-tap",false);
  int[] loc=new int[4];JSONObject point=stableDrawingTarget(s,selector,loc);
  assertTrue("Drawing native target is still presented and enabled",point.getBoolean("ready"));
  assertTrue("Native drawing tap delivered",androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).click(loc[0]+(int)Math.round(point.getDouble("x")*loc[2]/point.getDouble("width")),loc[1]+(int)Math.round(point.getDouble("y")*loc[3]/point.getDouble("height"))));
  }catch(AssertionError|Exception failure){
   try{JSONObject diagnostic=writeDrawingTapDiagnostic(s,selector,sequence,"failed",true);failure.addSuppressed(new AssertionError("Native drawing tap evidence="+diagnostic.toString()));}catch(AssertionError|Exception diagnosticFailure){failure.addSuppressed(diagnosticFailure);}throw failure;
  }
 }
 private void chooseDrawingOption(ActivityScenario<MainActivity>s,String selector,String value)throws Exception{
  waitFor(s,"drawing option available "+selector,"(()=>{const n=document.querySelector('#field-drawing-frame')?.contentDocument?.querySelector("+JSONObject.quote(selector)+");return !!n&&[...n.options].some(o=>o.value==="+JSONObject.quote(value)+"&&!o.disabled);})()");
  int index=((Number)js(s,"[...document.querySelector('#field-drawing-frame').contentDocument.querySelector("+JSONObject.quote(selector)+").options].findIndex(o=>o.value==="+JSONObject.quote(value)+")")).intValue();
  assertTrue("Requested drawing choice exists",index>=0);tapDrawing(s,selector+"+button");
  waitFor(s,"native drawing selector is open","document.querySelector('#field-drawing-frame')?.contentWindow.MIRFieldChoices.isOpen()===true");
  tapDrawing(s,".mir-choice-sheet[open] [data-choice-index=\""+index+"\"]");
  waitFor(s,"native drawing choice applied","(()=>{const f=document.querySelector('#field-drawing-frame');return f?.contentDocument.querySelector("+JSONObject.quote(selector)+")?.value==="+JSONObject.quote(value)+"&&!f.contentWindow.MIRFieldChoices.isOpen();})()");
 }
 private boolean drawingKeyboardVisible(ActivityScenario<MainActivity>s){
  boolean[] visible={false};s.onActivity(a->{androidx.core.view.WindowInsetsCompat insets=androidx.core.view.ViewCompat.getRootWindowInsets(a.getBridge().getWebView());visible[0]=insets!=null&&insets.isVisible(androidx.core.view.WindowInsetsCompat.Type.ime());});return visible[0];
 }
 private void awaitDrawingKeyboard(ActivityScenario<MainActivity>s,boolean expected)throws Exception{
  long deadline=SystemClock.uptimeMillis()+10000;while(SystemClock.uptimeMillis()<deadline){if(drawingKeyboardVisible(s)==expected)return;SystemClock.sleep(100);}failWithScreenshot("failed-pliage-keyboard","Pliage Android IME visible="+expected+" not observed");
 }
 private void closeDrawingKeyboard(ActivityScenario<MainActivity>s)throws Exception{
  if(drawingKeyboardVisible(s)){assertTrue(androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack());awaitDrawingKeyboard(s,false);}presentFrame(s);
 }
 private void typeDrawingNumber(ActivityScenario<MainActivity>s,String selector,String value)throws Exception{
  assertTrue("Numeric native input only",value.matches("[0-9]+(\\.[0-9]+)?"));tapDrawing(s,selector);awaitDrawingKeyboard(s,true);
  androidx.test.uiautomator.UiDevice device=androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
  assertTrue("Native select-all",device.pressKeyCode(android.view.KeyEvent.KEYCODE_A,android.view.KeyEvent.META_CTRL_ON));assertTrue("Native delete",device.pressKeyCode(android.view.KeyEvent.KEYCODE_DEL));
  for(char c:value.toCharArray())assertTrue("Native numeric key",device.pressKeyCode(c=='.'?android.view.KeyEvent.KEYCODE_PERIOD:android.view.KeyEvent.KEYCODE_0+c-'0'));
  waitFor(s,"native numeric value applied "+selector,"document.querySelector('#field-drawing-frame')?.contentDocument.querySelector("+JSONObject.quote(selector)+")?.value==="+JSONObject.quote(value));
 }
 private JSONObject compactDrawingProof(ActivityScenario<MainActivity>s,String name)throws Exception{
  presentFrame(s);JSONObject proof=(JSONObject)js(s,MirPliageCompactProbe.SCRIPT);assertTrue("Actual field iframe is present",proof.getBoolean("ready"));
  float[] scale={0};int[] zoom={0};s.onActivity(a->{scale[0]=a.getResources().getConfiguration().fontScale;zoom[0]=a.getBridge().getWebView().getSettings().getTextZoom();});
  proof.put("fontScale",scale[0]).put("textZoom",zoom[0]).put("physicalDevice",false).put("keyboardVisible",drawingKeyboardVisible(s)).put("screenshot",screenshot(s,name));
  java.nio.file.Files.write(new File(proofDirectory(),name+".json").toPath(),proof.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));return proof;
 }
 private void assertDrawingControl(JSONObject proof,String key)throws Exception{
  JSONObject control=proof.getJSONObject("controls").getJSONObject(key);assertTrue("Visible drawing control "+key,control.getBoolean("visible"));assertTrue("Unobstructed drawing control "+key,control.getBoolean("hit"));
 }
 private void assertCompactMeasurements(JSONObject proof,boolean allFields)throws Exception{
  assertEquals("2",proof.getString("stage"));assertEquals("true",proof.getString("fieldShell"));assertEquals("true",proof.getString("fieldPliage"));
  JSONObject parent=proof.getJSONObject("parent"),frame=proof.getJSONObject("frame");assertTrue("Samsung-like CSS width",parent.getInt("width")>=390&&parent.getInt("width")<=395);
  assertTrue("Real shell makes the drawing frame shorter than the page",frame.getInt("height")<parent.getInt("height")-120);assertTrue("Compact field iframe, not a full-viewport fixture",frame.getInt("height")<=570);
  assertTrue("Measurement page has no document or internal scrolling",proof.getBoolean("noScroll"));assertTrue("Diagram is fully visible",proof.getJSONObject("diagram").getBoolean("visible"));
  assertFalse("No duplicate native banner over the iframe title",proof.getBoolean("duplicateNativeBanner"));
  assertDrawingControl(proof,"back");assertDrawingControl(proof,"next");assertEquals("No angle +/- controls",0,proof.getInt("minusPlus"));
  int visibleSides=0,visibleAngles=0;double firstInput=Double.POSITIVE_INFINITY;
  for(String kind:new String[]{"sides","angles"}){JSONArray controls=proof.getJSONArray(kind);for(int i=0;i<controls.length();i++){JSONObject control=controls.getJSONObject(i);if(control.getBoolean("visible")){assertTrue("Presented "+kind+" control is not covered",control.getBoolean("hit"));firstInput=Math.min(firstInput,control.getJSONObject("rect").getDouble("top"));if(kind.equals("sides"))visibleSides++;else visibleAngles++;}}}
  assertTrue("Drawing remains above measurements and angles",proof.getJSONObject("diagram").getJSONObject("rect").getDouble("bottom")<=firstInput+1);
  if(allFields){assertEquals("Three measurements visible together",3,visibleSides);assertEquals("Both angles visible together",2,visibleAngles);}else{assertTrue(visibleSides>=2);assertTrue(visibleAngles>=1);}
  JSONArray markers=proof.getJSONArray("markers");assertTrue("Numerical profile annotations present",markers.length()>=visibleSides);assertFalse("Profile captions do not overlap",proof.getBoolean("labelsOverlap"));double minFont=Double.POSITIVE_INFINITY;JSONObject b=null,c=null;
  for(int i=0;i<markers.length();i++){JSONObject marker=markers.getJSONObject(i);assertTrue("Visible caption "+marker.getString("label"),marker.getBoolean("visible"));assertTrue("Numeric caption "+marker.getString("caption"),marker.getString("caption").matches(".*[0-9].*"));double font=marker.getDouble("fontCssPx");assertTrue("At least 11 rendered CSS px for "+marker.getString("label")+": "+font,font>=10.99);assertTrue("Caption stroke cannot cover its glyphs",marker.getDouble("strokeCssPx")<=1.5);minFont=Math.min(minFont,font);if(marker.getString("label").equals("B"))b=marker;if(marker.getString("label").equals("C"))c=marker;}
  JSONArray paths=proof.getJSONArray("paths");for(int i=0;i<paths.length();i++)assertTrue("Profile stroke is thinner than its dimension text",paths.getJSONObject(i).getDouble("strokeCssPx")<minFont*.5);
  if(allFields){assertNotNull(b);assertNotNull(c);assertTrue("C above the folded return",c.getJSONArray("center").getDouble(1)<c.getJSONArray("anchor").getDouble(1));assertTrue("B below its supporting flange",b.getJSONArray("center").getDouble(1)>b.getJSONArray("anchor").getDouble(1));}
 }
 private Object traceGeometry(ActivityScenario<MainActivity>s)throws Exception{
  return js(s,"(()=>{const state=document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState(),m=state.model;return JSON.stringify({tool:state.tool,points:m.pointsMM,drawPoints:state.drawPointsMM,segments:m.segments,bends:m.bends});})()");
 }
 private JSONObject traceStateHashes(Object geometry,Object cart)throws Exception{
  return new JSONObject().put("geometrySha256",hex(java.security.MessageDigest.getInstance("SHA-256").digest(geometry.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)))).put("cartSha256",hex(java.security.MessageDigest.getInstance("SHA-256").digest(cart.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8))));
 }
 private void assertTracePresentation(ActivityScenario<MainActivity>s,JSONObject proof)throws Exception{
  assertEquals("1",proof.getString("stage"));assertTrue("Trace remains fully on screen",proof.getJSONObject("diagram").getBoolean("visible"));assertTrue("Trace page does not introduce scrolling",proof.getBoolean("noScroll"));
  for(String key:new String[]{"undo","restart","continue"})assertDrawingControl(proof,key);
  JSONObject ui=(JSONObject)js(s,"""
   (()=>{const f=document.querySelector('#field-drawing-frame'),d=f.contentDocument,w=f.contentWindow,b=d.querySelector('#field-trace-expand'),svg=d.querySelector('#production-drawing svg'),grid=svg?.querySelector('#mir-trace-major'),matrix=svg?.getScreenCTM(),state=w.MIRProductionWorkspace.getLivePreviewState(),r=svg?.getBoundingClientRect();
    const scale=Number(grid?.getAttribute('width'))/(state.model.unit==='mm'?10:25.4),ox=Number(grid?.getAttribute('x')),oy=Number(grid?.getAttribute('y'));
    const pointsVisible=!!matrix&&Number.isFinite(scale)&&scale>0&&state.drawPointsMM.length>0&&state.drawPointsMM.every(([x,y])=>{const p=svg.createSVGPoint();p.x=ox+x*scale;p.y=oy-y*scale;const q=p.matrixTransform(matrix);return q.x>=r.left-1&&q.x<=r.right+1&&q.y>=r.top-1&&q.y<=r.bottom+1&&q.x>=-1&&q.x<=w.innerWidth+1&&q.y>=-1&&q.y<=w.innerHeight+1;});
    return {expanded:d.body.dataset.fieldTraceExpanded==='true',ariaExpanded:b?.getAttribute('aria-expanded'),ariaControls:b?.getAttribute('aria-controls'),label:b?.textContent.trim(),svgRect:r?.toJSON(),pointsVisible,pointCount:state.drawPointsMM.length,legacyUIAbsent:!d.querySelector('#client-point-x,#client-point-y,#client-keyboard-point,.client-keyboard-trace,.client-trace-options,#client-example-l')};})()
   """);
  assertTrue("Every drawn point remains inside the visible SVG",ui.getBoolean("pointsVisible"));
  JSONObject toolbarControls=new JSONObject();for(String selector:new String[]{"#field-trace-expand","#trace-height+button"}){JSONObject control=(JSONObject)js(s,drawingTargetExpression(selector));assertTrue("Trace toolbar control is presented "+selector,control.getBoolean("ready"));toolbarControls.put(selector,control);}ui.put("controls",toolbarControls);proof.put("traceToolbar",ui);
  assertTrue("No coordinate editor, trace options or example shortcut in the app",ui.getBoolean("legacyUIAbsent"));
  Object parentShellVisible=js(s,"['#field-header','#portal-navigation'].every(selector=>{const n=document.querySelector(selector),r=n?.getBoundingClientRect();if(!r||r.width<=0||r.height<=0||r.top<0||r.bottom>innerHeight)return false;const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!hit&&(hit===n||n.contains(hit));})");assertEquals("App header and bottom navigation remain presented",Boolean.TRUE,parentShellVisible);ui.put("parentShellVisible",parentShellVisible);
 }
 private JSONObject assertNativeTraceExpansion(ActivityScenario<MainActivity>s,String role)throws Exception{
  Object geometry=traceGeometry(s),cart=js(s,"JSON.stringify(MIRUnifiedOrderCart.list())");
  JSONObject stateHashes=new JSONObject().put("collapsed",traceStateHashes(geometry,cart));
  JSONObject normal=compactDrawingProof(s,"v130010-"+role+"-pliage-trace-collapsed");assertTracePresentation(s,normal);
  assertEquals("Collapsed trace control state",Boolean.TRUE,js(s,"document.querySelector('#field-drawing-frame').contentDocument.querySelector('#field-trace-expand').getAttribute('aria-expanded')==='false'"));
  tapDrawing(s,"#field-trace-expand");
  waitFor(s,"expanded trace and reduce action are presented","(()=>{const d=document.querySelector('#field-drawing-frame').contentDocument,b=d.querySelector('#field-trace-expand');return d.body.dataset.fieldTraceExpanded==='true'&&b.getAttribute('aria-expanded')==='true'&&b.getAttribute('aria-controls')==='production-drawing'&&b.textContent.trim()==='Réduire';})()");
  JSONObject expanded=compactDrawingProof(s,"v130010-"+role+"-pliage-trace-expanded");assertTracePresentation(s,expanded);
  JSONObject beforeBox=normal.getJSONObject("diagram").getJSONObject("rect"),expandedBox=expanded.getJSONObject("diagram").getJSONObject("rect");
  assertTrue("Enlarging gives the actual grid more drawing area",expandedBox.getDouble("width")*expandedBox.getDouble("height")>beforeBox.getDouble("width")*beforeBox.getDouble("height")+1);
  JSONObject beforeSvg=normal.getJSONObject("traceToolbar").getJSONObject("svgRect"),expandedSvg=expanded.getJSONObject("traceToolbar").getJSONObject("svgRect");assertTrue("The actual SVG grows with its drawing area",expandedSvg.getDouble("width")*expandedSvg.getDouble("height")>beforeSvg.getDouble("width")*beforeSvg.getDouble("height")+1);
  Object expandedGeometry=traceGeometry(s),expandedCart=js(s,"JSON.stringify(MIRUnifiedOrderCart.list())");stateHashes.put("expanded",traceStateHashes(expandedGeometry,expandedCart));assertEquals("Enlarging preserves all drawn points, lengths and bends",geometry,expandedGeometry);assertEquals("Enlarging preserves the entire existing cart",cart,expandedCart);
  tapDrawing(s,"#field-trace-expand");
  waitFor(s,"reduced trace and expand action are presented","(()=>{const d=document.querySelector('#field-drawing-frame').contentDocument,b=d.querySelector('#field-trace-expand');return d.body.dataset.fieldTraceExpanded==='false'&&b.getAttribute('aria-expanded')==='false'&&b.textContent.trim()==='Agrandir';})()");
  JSONObject reduced=compactDrawingProof(s,"v130010-"+role+"-pliage-trace-reduced");assertTracePresentation(s,reduced);
  JSONObject afterBox=reduced.getJSONObject("diagram").getJSONObject("rect");assertEquals("Reduced grid restores its original width",beforeBox.getDouble("width"),afterBox.getDouble("width"),1);assertEquals("Reduced grid restores its original height",beforeBox.getDouble("height"),afterBox.getDouble("height"),1);
  Object reducedGeometry=traceGeometry(s),reducedCart=js(s,"JSON.stringify(MIRUnifiedOrderCart.list())");stateHashes.put("reduced",traceStateHashes(reducedGeometry,reducedCart));assertEquals("Reducing preserves all drawn points, lengths and bends",geometry,reducedGeometry);assertEquals("Reducing preserves the entire existing cart",cart,reducedCart);
  return new JSONObject().put("collapsed",normal).put("expanded",expanded).put("reduced",reduced).put("stateHashes",stateHashes).put("geometryPreserved",true).put("cartPreserved",true).put("parentShellPreserved",true);
 }
 private JSONObject prepareCompactTrace(ActivityScenario<MainActivity>s,String role)throws Exception{
  String cart=(String)js(s,"JSON.stringify(MIRUnifiedOrderCart.list().map(row=>row.id))");JSONObject proof=new JSONObject();
  JSONObject controls=compactDrawingProof(s,"v130010-"+role+"-pliage-trace-actions");for(String key:new String[]{"undo","restart","continue"})assertDrawingControl(controls,key);proof.put("traceActions",controls);
  tapDrawing(s,"[data-drawing-undo]");waitFor(s,"undo removes exactly the last point","document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length===2");
  tapDrawing(s,"#client-new-trace");waitFor(s,"restart asks before discarding local drawing","!!document.querySelector('#field-drawing-frame').contentDocument.querySelector('#production-dialog[open] #confirm-client-new-trace')");
  proof.put("restartConfirmation",screenshot(s,"v130010-"+role+"-pliage-restart-confirmation"));tapDrawing(s,"#production-dialog[open] [data-close-production-dialog]");
  waitFor(s,"cancel restart keeps both points","!document.querySelector('#field-drawing-frame').contentDocument.querySelector('#production-dialog[open]')&&document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length===2");
  tapDrawing(s,"#client-new-trace");tapDrawing(s,"#confirm-client-new-trace");waitFor(s,"confirmed restart clears only the current trace","document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length===0");assertEquals("Restart preserves existing cart",cart,js(s,"JSON.stringify(MIRUnifiedOrderCart.list().map(row=>row.id))"));
  tapDrawing(s,"#field-trace-expand");waitFor(s,"enlarged grid can receive the tall folding profile","document.querySelector('#field-drawing-frame').contentDocument.body.dataset.fieldTraceExpanded==='true'");
  double[][] points={{2,2},{2,7.5},{5,7.5},{4.25,7.5}};JSONArray gestures=new JSONArray();
  try{for(int i=0;i<points.length;i++){
   compactTracePointIndex=i+1;
   gestures.put(tapDrawingGrid(s,points[i][0],points[i][1]));
   if(i==3){waitFor(s,"hem direction choice is presented","!!document.querySelector('#field-drawing-frame').contentDocument.querySelector('#production-dialog[open] #trace-hem-form')");tapDrawing(s,"#trace-hem-form label:has(input[value=left])");tapDrawing(s,"#trace-hem-form button[type=submit]");}
   waitFor(s,"native touch added exactly trace point "+(i+1),"document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length==="+(i+1));
  }}finally{compactTracePointIndex=0;}
  waitFor(s,"native touchscreen profile includes the real 180 degree hem","(()=>{const m=document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().model;return m.valid&&m.segments.length===3&&m.bends.length===2&&m.bends[1].mode==='hem'&&m.bends[1].angle===180;})()");
  tapDrawing(s,"#field-trace-expand");waitFor(s,"constructed folding profile returns to the compact grid","document.querySelector('#field-drawing-frame').contentDocument.body.dataset.fieldTraceExpanded==='false'");
  proof.put("undoRemovedOnePoint",true).put("cancelRestartPreservedTrace",true).put("confirmedRestartPreservedCart",true).put("construction","native touchscreen and native hem choice").put("traceGestures",gestures);return proof;
 }
 private void openFieldDrawing(ActivityScenario<MainActivity>s)throws Exception{
  tap(s,"[data-field-catalogue=fold]");
  waitFor(s,"Pliages offers model and drawing choices","(()=>{const f=document.querySelector('#field-drawing-frame'),d=f?.contentDocument;return !!f?.closest('.mir-app-drawing[data-field-drawing-state=ready]')&&getComputedStyle(f).visibility==='visible'&&!f.inert&&!!f.contentWindow.MIRProductionWorkspace&&['#client-choose-model','#client-draw-profile'].every(selector=>{const n=d?.querySelector(selector);return !!n&&!n.disabled&&n.getClientRects().length>0;})&&!document.querySelector('[data-field-draw]');})()");
  tapDrawing(s,"#client-draw-profile");
 }
 private void reopenCompactMeasurements(ActivityScenario<MainActivity>s)throws Exception{
  waitFor(s,"ready after Android font change","window.MIRPortalActiveClient?.getStatus().phase==='ready'&&document.body.dataset.fieldShell==='true'");tap(s,"#portal-navigation [data-view=command]");openFieldDrawing(s);
  waitFor(s,"saved three-sided profile is restored","document.querySelector('#field-drawing-frame')?.contentWindow.MIRProductionWorkspace?.getLivePreviewState().model.segments?.length===3");
  if("1".equals(js(s,"document.querySelector('#field-drawing-frame').contentDocument.body.dataset.clientStage")))tapDrawing(s,"[data-draw-tool=draw]");
  waitFor(s,"restored profile measurements","document.querySelector('#field-drawing-frame').contentDocument.body.dataset.clientStage==='2'");
 }
 private void applyDrawingFontScale(ActivityScenario<MainActivity>s,String value)throws Exception{
  shell("settings put system font_scale "+value);float[] actual={0};long deadline=SystemClock.uptimeMillis()+15000;
  do{s.onActivity(a->actual[0]=a.getResources().getConfiguration().fontScale);if(Math.abs(actual[0]-Float.parseFloat(value))<.01)break;SystemClock.sleep(100);}while(SystemClock.uptimeMillis()<deadline);
  assertEquals("Android applied drawing font preference",Float.parseFloat(value),actual[0],.01);s.recreate();reopenCompactMeasurements(s);
 }
 private JSONObject assertCompactPliage(ActivityScenario<MainActivity>s,String role,JSONObject proof)throws Exception{
  // Physical taps construct the profile; its exact fabrication dimensions are
  // then entered with the same real Android keyboard used by the employee.
  typeDrawingNumber(s,"[data-segment-length=\"0\"]","5.5");closeDrawingKeyboard(s);
  typeDrawingNumber(s,"[data-segment-length=\"1\"]","3");closeDrawingKeyboard(s);
  typeDrawingNumber(s,"[data-segment-length=\"2\"]","1.5");
  waitFor(s,"native C measurement changes geometry","Math.abs(document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().model.segments[2].lengthMM-38.1)<.01");
  JSONObject measureKeyboard=compactDrawingProof(s,"v130010-"+role+"-pliage-measure-keyboard");assertTrue(measureKeyboard.getBoolean("keyboardVisible"));assertTrue("Focused C remains visible with IME",measureKeyboard.getJSONObject("focused").getBoolean("visible"));assertEquals("2",measureKeyboard.getJSONObject("focused").getString("measure"));proof.put("measureKeyboard",measureKeyboard);closeDrawingKeyboard(s);
  typeDrawingNumber(s,"[data-client-bend-angle=\"0\"]","91");
  waitFor(s,"native angle changes independently of the hem","(()=>{const m=document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().model;return Math.abs(180-Math.abs(m.bends[0].turnDeg)-91)<.01&&m.bends[1].mode==='hem'&&m.bends[1].angle===180;})()");
  JSONObject angleKeyboard=compactDrawingProof(s,"v130010-"+role+"-pliage-angle-keyboard");assertTrue(angleKeyboard.getBoolean("keyboardVisible"));assertTrue("Focused angle remains visible with IME",angleKeyboard.getJSONObject("focused").getBoolean("visible"));assertEquals("0",angleKeyboard.getJSONObject("focused").getString("angle"));assertEquals("numeric",angleKeyboard.getJSONArray("angles").getJSONObject(0).getString("inputMode"));assertEquals("1",js(s,"document.querySelector('#field-drawing-frame').contentDocument.querySelector('[data-client-bend-angle=\"0\"]').getAttribute('step')"));assertEquals(0,angleKeyboard.getInt("minusPlus"));proof.put("angleKeyboard",angleKeyboard);
  typeDrawingNumber(s,"[data-client-bend-angle=\"0\"]","90");closeDrawingKeyboard(s);
  waitFor(s,"measurement layout restored after closing IME","("+MirPliageCompactProbe.SCRIPT+").noScroll");JSONObject normal=compactDrawingProof(s,"v130010-"+role+"-pliage-compact-measures");assertCompactMeasurements(normal,true);proof.put("normal",normal);
  JSONArray segments=normal.getJSONObject("model").getJSONArray("segments");assertEquals(139.7,segments.getJSONObject(0).getDouble("lengthMM"),.01);assertEquals(76.2,segments.getJSONObject(1).getDouble("lengthMM"),.01);assertEquals(38.1,segments.getJSONObject(2).getDouble("lengthMM"),.01);
  String geometry=(String)js(s,"JSON.stringify(document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().model.pointsMM)"),original=shell("settings get system font_scale");JSONArray large=new JSONArray();
  Throwable fontTrialFailure=null;
  try{
   applyDrawingFontScale(s,"1.5");
   java.util.Set<String> sides=new java.util.HashSet<>();java.util.Set<Integer> angles=new java.util.HashSet<>();
   for(int page=1;page<=4;page++){
    JSONObject metrics=compactDrawingProof(s,"v130010-"+role+"-pliage-font15-page"+page);assertEquals(1.5,metrics.getDouble("fontScale"),.01);assertEquals(150,metrics.getInt("textZoom"));assertCompactMeasurements(metrics,false);large.put(metrics);
    for(int i=0;i<metrics.getJSONArray("sides").length();i++){JSONObject side=metrics.getJSONArray("sides").getJSONObject(i);if(side.getBoolean("visible"))sides.add(side.getString("label"));}
    for(int i=0;i<metrics.getJSONArray("angles").length();i++){JSONObject angle=metrics.getJSONArray("angles").getJSONObject(i);if(angle.getBoolean("visible"))angles.add(angle.getInt("index"));}
    JSONObject next=metrics.getJSONObject("controls").getJSONObject("pageNext");if(!next.getBoolean("exists")||next.getBoolean("disabled"))break;assertDrawingControl(metrics,"pageNext");tapDrawing(s,"[data-field-measure-page-step=\"1\"]");
   }
   assertEquals("Every enlarged measurement has a visible page",new java.util.HashSet<>(java.util.Arrays.asList("A","B","C")),sides);assertEquals("Both enlarged angles have a visible page",new java.util.HashSet<>(java.util.Arrays.asList(0,1)),angles);
  }catch(AssertionError|Exception failure){fontTrialFailure=failure;throw failure;}
  finally{
   try{applyDrawingFontScale(s,original.matches("[0-9.]+")?original:"1.0");}
   catch(AssertionError|Exception restoreFailure){if(fontTrialFailure!=null)fontTrialFailure.addSuppressed(restoreFailure);else throw restoreFailure;}
  }
  assertEquals("Android font changes preserve the actual profile geometry",geometry,js(s,"JSON.stringify(document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().model.pointsMM)"));proof.put("largeTextPages",large).put("geometryPreservedAfterFontChange",true);
  return proof;
 }
 private android.graphics.Rect contentArea(ActivityScenario<MainActivity>s)throws Exception{
  JSONObject p=(JSONObject)js(s,"(()=>{const h=document.querySelector('#field-header').getBoundingClientRect(),n=document.querySelector('#portal-navigation').getBoundingClientRect(),b=document.querySelector('#mir-native-state')?.getBoundingClientRect();return{width:innerWidth,height:innerHeight,top:Math.max(h.bottom,b?.bottom||0)+8,bottom:n.top-8};})()");
  int[] loc=new int[4];s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.getLocationOnScreen(loc);loc[2]=web.getWidth();loc[3]=web.getHeight();});double sx=loc[2]/p.getDouble("width"),sy=loc[3]/p.getDouble("height");return new android.graphics.Rect(loc[0]+(int)(8*sx),loc[1]+(int)Math.ceil(p.getDouble("top")*sy),loc[0]+loc[2]-(int)(8*sx),loc[1]+(int)Math.floor(p.getDouble("bottom")*sy));
 }
 private String fieldContent(String tab){
  String nav="document.querySelector('#portal-navigation [data-view="+tab+"]')?.getAttribute('aria-current')==='page'";
  String content;
  switch(tab){
   case "day":content="!!document.querySelector('.field-home .field-job-hero') && document.querySelector('#portal-content h1')?.textContent.startsWith('Bonjour, ') && (()=>{const n=document.querySelector('[data-field-home-job]'),o=n?.selectedOptions[0],b=n?.nextElementSibling;return !!o&&o.value==='7da20261-1114-4000-8000-000000000001'&&o.textContent.includes('QA-UX')&&b?.getBoundingClientRect().height>=44&&b.textContent.includes('QA-UX')&&/rue fictive QA/.test(document.querySelector('.field-job-address')?.textContent||'');})() && !!document.querySelector('[data-route-job]')";break;
   case "command":content="document.querySelector('#portal-content h1')?.textContent==='Commande' && document.body.dataset.fieldView==='catalogue' && !!document.querySelector('[data-field-catalogue=material]') && !!document.querySelector('[data-field-catalogue=fold]') && !document.querySelector('[data-field-draw]')";break;
   case "punch":content="document.querySelector('#portal-content h1')?.textContent==='Punch' && !!document.querySelector('.field-punch-clock') && !!document.querySelector('[data-punch]') && !!document.querySelector('#portal-content [data-view=punch-hours]') && /^\\d{2,}:\\d{2}:\\d{2}$/.test(document.querySelector('.field-elapsed')?.textContent||'')";break;
   case "messages":content="document.querySelector('#portal-content h1')?.textContent==='Messages' && !!document.querySelector('#chat-search-form') && !!document.querySelector('.chat-workspace') && ['job','team','private'].every(kind=>!!document.querySelector('[data-field-message-filter='+kind+']')) && !!document.querySelector('[data-field-message-new]')";break;
   case "more":content="document.querySelector('#portal-content h1')?.textContent==='Plus' && !!document.querySelector('.mir-app-p10') && !!document.querySelector('#portal-content [data-view=absences]') && !!document.querySelector('#portal-content [data-view=expenses]') && !!document.querySelector('#portal-content [data-field-request=tool]')";break;
   default:throw new IllegalArgumentException("Unknown field tab");
  }return "("+nav+") && ("+content+") && !document.querySelector('dialog[open]')";
 }
 private void collectClockRegions(ActivityScenario<MainActivity>s,android.graphics.Rect crop)throws Exception{
  if(Boolean.TRUE.equals(js(s,"!!document.querySelector('.field-clock-dial')"))){int[] nativeY=new int[2];s.onActivity(a->a.getBridge().getWebView().getLocationOnScreen(nativeY));assertTrue("Fixed header excludes the entire animated dial", ((Number)js(s,"document.querySelector('.field-clock-dial').getBoundingClientRect().top")).doubleValue()*crop.width()/((Number)js(s,"innerWidth-16")).doubleValue()+nativeY[1]>=fixedHeader.bottom);}
  JSONObject data=(JSONObject)js(s,"({width:innerWidth,height:innerHeight,rects:[...document.querySelectorAll('[data-confirmed-start]')].filter(n=>n.dataset.confirmedStart&&n.getClientRects().length&&!n.closest('dialog:not([open])')).map(n=>{const range=document.createRange();range.selectNodeContents(n);const r=range.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom};})})");int[] loc=new int[4];s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();web.getLocationOnScreen(loc);loc[2]=web.getWidth();loc[3]=web.getHeight();});double sx=loc[2]/data.getDouble("width"),sy=loc[3]/data.getDouble("height");JSONArray rects=data.getJSONArray("rects");for(int i=0;i<rects.length();i++){JSONObject r=rects.getJSONObject(i);android.graphics.Rect mask=new android.graphics.Rect(Math.max(crop.left,loc[0]+(int)Math.floor((r.getDouble("left")-2)*sx)),Math.max(crop.top,loc[1]+(int)Math.floor((r.getDouble("top")-2)*sy)),Math.min(crop.right,loc[0]+(int)Math.ceil((r.getDouble("right")+2)*sx)),Math.min(crop.bottom,loc[1]+(int)Math.ceil((r.getDouble("bottom")+2)*sy)));assertTrue("Only a measured clock region is masked",mask.width()>0&&mask.height()>0&&(long)mask.width()*mask.height()<(long)crop.width()*crop.height()/10);if(!dynamicRegions.contains(mask))dynamicRegions.add(mask);}
 }
 private JSONObject assertConfirmedClock(ActivityScenario<MainActivity>s)throws Exception{
  waitFor(s,"confirmed Punch and authorized job metadata visible","!!MIRPortalActiveClient.getStatus().snapshot.punch?.activeShift && !!document.querySelector('.field-elapsed') && /rue fictive QA/.test(document.querySelector('[data-field-punch-job]')?.nextElementSibling?.textContent||'')");JSONObject clock=(JSONObject)js(s,"(()=>{const a=MIRPortalActiveClient.getStatus().snapshot.punch.activeShift;return{actorId:MIRPortalActiveClient.getStatus().snapshot.actorId,id:a.id,startedAt:a.started_at,device:a.device_id,seconds:Math.max(0,Math.floor((Date.now()-Date.parse(a.started_at))/1000)),day:document.querySelector('.field-elapsed').textContent,segmentId:a.segment?.id,jobId:a.segment?.job_id,displayedJobId:document.querySelector('[data-field-punch-job]')?.value||''};})()");JSONObject runFixture=nativeQaFixture();JSONObject exactActor=runFixture.getJSONObject(clock.getString("actorId").equals("3980647a-d83a-48ad-9d90-8fc2b314807f")?"employee":"chef");assertEquals("Active actor matches the specific QA run",clock.getString("actorId"),exactActor.getString("id"));assertEquals("Exact per-run synthetic marker",runFixture.getString("marker"),clock.getString("device"));assertEquals("Exact per-run shift",exactActor.getString("shift"),clock.getString("id"));assertEquals("Exact per-run segment",exactActor.getString("segment"),clock.getString("segmentId"));String[] parts=clock.getString("day").split(":");assertEquals(3,parts.length);long seconds=Long.parseLong(parts[0])*3600+Long.parseLong(parts[1])*60+Long.parseLong(parts[2]);assertTrue("Displayed elapsed time follows confirmed timestamp",Math.abs(seconds-clock.getLong("seconds"))<=2);assertTrue("Representative active duration",seconds>=15*60);assertEquals("Actual pointed job remains identified",clock.getString("jobId"),clock.getString("displayedJobId"));assertFalse(clock.getString("segmentId").isEmpty());tap(s,"[data-field-movement]");waitFor(s,"confirmed segment details are visible","!!document.querySelector('#portal-dialog[open] .field-segment-time time') && /Chantier en cours/.test(document.querySelector('.field-segment-time').textContent)");JSONObject segment=(JSONObject)js(s,"(()=>{const a=MIRPortalActiveClient.getStatus().snapshot.punch.activeShift,n=document.querySelector('.field-segment-time time');return{expected:Math.max(0,Math.floor((Date.now()-Date.parse(a.segment.started_at))/1000)),value:n.textContent};})()");String[] time=segment.getString("value").split(":");assertEquals(3,time.length);assertTrue("Segment elapsed follows its own confirmed start",Math.abs(Long.parseLong(time[0])*3600+Long.parseLong(time[1])*60+Long.parseLong(time[2])-segment.getLong("expected"))<=2);tap(s,"#portal-dialog .dialog-close[data-close-dialog]");waitFor(s,"native close dismissed the Punch details",fieldContent("punch"));return clock;
 }
 private JSONObject renderedScreenshot(ActivityScenario<MainActivity>s,String name,String expected,android.graphics.Rect fixedContent,java.util.Set<String> forbidden)throws Exception{
  waitFor(s,expected);presentFrame(s);long deadline=SystemClock.uptimeMillis()+12000,stableSince=0;String previous=null;int attempts=0;
  while(SystemClock.uptimeMillis()<deadline){
   assertEquals("Screen DOM remains bound to requested content",Boolean.TRUE,js(s,expected));androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).waitForIdle(500);android.graphics.Bitmap bitmap=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();assertNotNull(bitmap);attempts++;
   try{String hash=pixelHash(bitmap,fixedContent);String headerHash=pixelHash(bitmap,fixedHeader,false);boolean unique=!forbidden.contains(hash)&&(!name.matches(".*-(day|command|punch|messages|more)$")||!headerHashes.contains(headerHash));if(!unique||!hash.equals(previous)){previous=hash;stableSince=SystemClock.uptimeMillis();}else if(SystemClock.uptimeMillis()-stableSince>=250){JSONObject proof=saveScreenshot(name,bitmap,fixedContent).put("presentationAttempts",attempts).put("viewport",js(s,"(()=>{const rect=q=>{const n=document.querySelector(q);return n?n.getBoundingClientRect().toJSON():null};return{innerWidth,innerHeight,screenHeight:screen.height,visualViewport:{height:visualViewport?.height,offsetTop:visualViewport?.offsetTop,scale:visualViewport?.scale},header:rect('#field-header'),test:rect('#mir-native-state'),nav:rect('#portal-navigation'),documentHeight:document.documentElement.scrollHeight,paddingTop:getComputedStyle(document.body).paddingTop,paddingBottom:getComputedStyle(document.body).paddingBottom};})()")).put("density",InstrumentationRegistry.getInstrumentation().getTargetContext().getResources().getDisplayMetrics().density).put("fontScale",InstrumentationRegistry.getInstrumentation().getTargetContext().getResources().getConfiguration().fontScale).put("domHeading",js(s,"document.querySelector('#portal-content h1')?.textContent||''"));return proof;}}finally{bitmap.recycle();}
   presentFrame(s);SystemClock.sleep(120);
  }
  JSONObject rejected=screenshotSystem(name+"-rejected");fail("Requested DOM never produced a stable distinct native content frame: "+name+"; rejected="+rejected.getString("file"));return null;
 }
 private String shell(String command)throws Exception{android.os.ParcelFileDescriptor fd=InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand(command);try(java.io.InputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(fd);java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream()){byte[] buffer=new byte[1024];int count;while((count=in.read(buffer))>0)bytes.write(buffer,0,count);return bytes.toString("UTF-8").trim();}}
 private double renderedBodyText(ActivityScenario<MainActivity>s)throws Exception{return ((Number)js(s,"(()=>{const n=document.createElement('span');n.textContent='MIR';n.style.cssText='position:absolute;visibility:hidden;white-space:nowrap;font:inherit';document.body.append(n);const range=document.createRange();range.selectNodeContents(n);const height=range.getBoundingClientRect().height;n.remove();return height;})()")).doubleValue();}
 private String fieldMetadataReady(String view){
  if(view.equals("command")||view.equals("catalogue"))return "(()=>{const browse=document.querySelector('#employee-browse'),items=[...browse?.querySelectorAll('#catalogue-grid [data-field-product]')||[]];return !!browse?.querySelector('#catalogue-search')&&!!browse.querySelector('[data-field-store-filters]')&&items.length>0&&items.every(n=>n.dataset.fieldProduct&&n.textContent.trim())&&!browse.querySelector('#order-job,#order-job-reference,.field-store-context,.field-store-cart');})()";
  return "(()=>{const n=document.querySelector('[data-field-punch-job]'),o=n?.selectedOptions[0],b=n?.nextElementSibling;return n?.value==='7da20261-1114-4000-8000-000000000001'&&o?.textContent.includes('QA-UX-1')&&o.textContent.includes('10 rue fictive QA')&&b?.textContent.includes('QA-UX-1')&&b.textContent.includes('10 rue fictive QA');})()";
 }
 private JSONObject assertCompactCatalogue(ActivityScenario<MainActivity>s,String role)throws Exception{
  waitFor(s,"real catalogue entries are rendered without checkout context",fieldMetadataReady("catalogue"));presentFrame(s);
  JSONObject proof=(JSONObject)js(s,"""
   (()=>{
    const browse=document.querySelector('#employee-browse'),search=browse.querySelector('#catalogue-search'),filter=browse.querySelector('[data-field-store-filters]'),nav=document.querySelector('#portal-navigation'),list=browse.querySelector('#catalogue-grid'),rowList=list.querySelector('.mir-app-product-list'),clip=list.closest('.field-store-results')||list,cart=document.querySelector('#field-header [data-field-cart]');
    const rect=n=>n.getBoundingClientRect().toJSON(),styles=n=>{const s=getComputedStyle(n);return Object.fromEntries(['display','position','boxSizing','height','minHeight','maxHeight','paddingTop','paddingBottom','marginTop','marginBottom','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','overflow','overflowY','flex','flexBasis','flexGrow','flexShrink','gap','rowGap','transform'].map(key=>[key,s[key]]));};
    const describe=n=>n?{tag:n.tagName,id:n.id,classes:n.className,data:{...n.dataset},rect:rect(n),hidden:n.hidden,scrollTop:n.scrollTop,scrollLeft:n.scrollLeft,scrollHeight:n.scrollHeight,scrollWidth:n.scrollWidth,clientHeight:n.clientHeight,clientWidth:n.clientWidth,styles:styles(n)}:null;
    const navRect=rect(nav),clipRect=rect(clip),rowSelector='.mir-app-product-list > .field-store-item[data-field-product]';
    const rawMatches=[...list.querySelectorAll('[data-field-product]')].map(n=>{
     const r=rect(n),details=n.closest('details'),isCatalogueRow=n.matches(rowSelector);
     return{id:n.dataset.fieldProduct,rect:r,visible:r.top>=Math.max(64,clipRect.top)-1&&r.bottom<=Math.min(navRect.top,clipRect.bottom)+1,isCatalogueRow,classes:n.className,styles:styles(n),scrollTop:n.scrollTop,scrollHeight:n.scrollHeight,clientHeight:n.clientHeight,insideClosedDetails:!!details&&!details.open,details:details?{classes:details.className,open:details.open,rect:rect(details)}:null,title:describe(n.querySelector('strong')),subtitle:describe(n.querySelector('small'))};
    });
    const cards=rawMatches.filter(n=>n.isCatalogueRow),gap=Math.max(0,parseFloat(rowList?getComputedStyle(rowList).rowGap:'0')||0,...cards.slice(1).map((card,i)=>Math.max(0,card.rect.top-cards[i].rect.bottom))),rowHeight=Math.max(0,...cards.map(card=>card.rect.height)),firstTop=cards[0]?.rect.top??null,start=firstTop===null?null:Math.max(firstTop,clipRect.top,64),end=Math.min(navRect.top,clipRect.bottom),space=start===null?0:Math.max(0,end-start);
    return{width:innerWidth,height:innerHeight,scrollX,scrollY,visualViewport:visualViewport?{width:visualViewport.width,height:visualViewport.height,offsetTop:visualViewport.offsetTop,offsetLeft:visualViewport.offsetLeft,scale:visualViewport.scale}:null,document:describe(document.documentElement),body:describe(document.body),browse:describe(browse),page:describe(browse.closest('.field-store-page')),portalMain:describe(document.querySelector('#portal-main')),portalContent:describe(document.querySelector('#portal-content')),header:describe(document.querySelector('#field-header')),nav:describe(nav),list:describe(list),rowList:describe(rowList),clip:describe(clip),search:rect(search),filter:rect(filter),cards,rawMatches,capacity:{firstTop,start,end,space,maxRowHeight:rowHeight,gap,availableSlots:rowHeight>0?Math.floor((space+gap+1)/(rowHeight+gap)):0},availableHeight:getComputedStyle(document.documentElement).getPropertyValue('--field-available-height').trim(),dense:document.body.dataset.fieldDense||'',fontsStatus:document.fonts.status,countText:document.querySelector('#catalogue-count')?.textContent,pageText:document.querySelector('[data-field-page-label]')?.textContent,checkoutContextInBrowse:!!browse.querySelector('#order-job,#order-job-reference,.field-store-context,.field-store-cart'),categoriesInline:!!browse.querySelector('#catalogue-category,#favorites-filter'),headerCartVisible:!!cart?.getClientRects().length,tabs:['[data-field-catalogue=material]','[data-field-catalogue=fold]'].every(selector=>!!browse.querySelector(selector)?.getClientRects().length)&&!browse.querySelector('[data-field-draw]')};
   })()
   """);
  float[] nativeScale={0,0};int[] nativeDisplay={0,0,0,0};s.onActivity(a->{android.content.res.Resources resources=a.getResources();android.util.DisplayMetrics metrics=resources.getDisplayMetrics();nativeScale[0]=resources.getConfiguration().fontScale;nativeScale[1]=metrics.density;nativeDisplay[0]=metrics.densityDpi;nativeDisplay[1]=a.getBridge().getWebView().getSettings().getTextZoom();nativeDisplay[2]=metrics.widthPixels;nativeDisplay[3]=metrics.heightPixels;});
  JSONArray cards=proof.getJSONArray("cards");int visible=0;for(int i=0;i<cards.length();i++)if(cards.getJSONObject(i).getBoolean("visible"))visible++;
  boolean keyboardVisible=drawingKeyboardVisible(s),normalViewport=!keyboardVisible&&proof.getInt("width")>=390&&proof.getInt("width")<=395&&proof.getInt("height")>=700&&Math.abs(nativeScale[0]-1f)<.01&&nativeDisplay[1]==100&&!"large".equals(proof.getJSONObject("document").getJSONObject("data").optString("mirText"));
  proof.put("role",role).put("phase","before-compact-catalogue-assertions").put("physicalDevice",false).put("fontScale",nativeScale[0]).put("configuredFontScale",shell("settings get system font_scale")).put("density",nativeScale[1]).put("densityDpi",nativeDisplay[0]).put("textZoom",nativeDisplay[1]).put("displayWidthPx",nativeDisplay[2]).put("displayHeightPx",nativeDisplay[3]).put("visibleCount",visible).put("requiredVisibleCount",Math.min(5,cards.length())).put("keyboardVisible",keyboardVisible).put("normalViewport",normalViewport);
  // Persist the actual pre-assertion frame and measurements while the Activity is alive.
  // The runner's later failure screenshot can otherwise show the launcher after teardown.
  String name="v130010-"+role+"-catalogue-compact";proof.put("screenshot",screenshot(s,name));File diagnostic=new File(proofDirectory(),name+".json");assertFalse("Never overwrite catalogue diagnostic",diagnostic.exists());java.nio.file.Files.write(diagnostic.toPath(),proof.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));String measured="; measured="+proof.toString();
  assertFalse("Checkout context is absent from browsing"+measured,proof.getBoolean("checkoutContextInBrowse"));assertFalse("Categories are in their sheet"+measured,proof.getBoolean("categoriesInline"));assertTrue("Header cart remains visible"+measured,proof.getBoolean("headerCartVisible"));assertTrue("Three catalogue tabs remain visible"+measured,proof.getBoolean("tabs"));assertTrue("Filter control is beside the search field"+measured,proof.getJSONObject("filter").getDouble("left")>=proof.getJSONObject("search").getDouble("right")-1);
  assertTrue("At least five real entries fit when five exist; actual="+cards.length()+", visible="+visible+measured,visible>=Math.min(5,cards.length()));
  if(normalViewport)assertTrue("Normal Samsung viewport has vertical capacity for at least five real-sized rows"+measured,proof.getJSONObject("capacity").getInt("availableSlots")>=5);
  tap(s,"[data-field-store-filters]");waitFor(s,"catalogue categories are in the opened filter sheet","(()=>{const host=document.querySelector('#field-filter-host'),category=host?.querySelector('#catalogue-category'),favorite=host?.querySelector('#favorites-filter');return !!host?.getClientRects().length&&!!category&&!!favorite;})()");proof.put("filterScreenshot",screenshot(s,"v130010-"+role+"-catalogue-filters"));tap(s,"#portal-dialog [data-close-dialog]");waitFor(s,"catalogue filter sheet closed",fieldContent("command"));return proof;
 }
 private JSONObject assertNativeNavigationText(ActivityScenario<MainActivity>s,String view,float scale)throws Exception{
  JSONObject proof=(JSONObject)js(s,"(()=>{const entries=[...document.querySelectorAll('#portal-navigation.field-bottom button')].map(button=>{const box=button.getBoundingClientRect(),label=button.querySelector('span');if(!label)return{fits:false,touch:false,label:null};const range=document.createRange();range.selectNodeContents(label);const text=range.getBoundingClientRect();return{label:label.textContent,button:box.toJSON(),text:text.toJSON(),font:getComputedStyle(label).fontSize,fits:text.width>0&&text.height>0&&text.left>=box.left-1&&text.right<=box.right+1&&text.top>=box.top-1&&text.bottom<=box.bottom+1,touch:box.width>0&&box.height>=57};});return{count:entries.length,fits:entries.every(x=>x.fits),touch:entries.every(x=>x.touch),entries};})()");
  assertEquals("Five common navigation controls",5,proof.getInt("count"));
  if(!proof.getBoolean("fits"))screenshot(s,"failed-navigation-font"+String.valueOf(scale).replace(".","")+"-"+view);
  assertTrue("Navigation labels fit inside their own targets; view="+view+"; fontScale="+scale+"; measured="+proof.toString(),proof.getBoolean("fits"));
  assertTrue("Navigation retains its 58px touch targets within one layout pixel",proof.getBoolean("touch"));
  return proof;
 }
 private JSONArray assertAndroidFontScales(ActivityScenario<MainActivity>s,String role)throws Exception{
  String original=shell("settings get system font_scale");if(!original.matches("[0-9.]+"))original="1.0";JSONArray trials=new JSONArray();tap(s,"#portal-navigation [data-view=command]");waitFor(s,fieldContent("command"));double baseHeading=((Number)js(s,"(()=>{const r=document.createRange();r.selectNodeContents(document.querySelector('#portal-content h1'));return r.getBoundingClientRect().height;})()")).doubleValue();float baseScale=Float.parseFloat(original);double baseBodyText=renderedBodyText(s);
  try{for(String scale:new String[]{"1.5","2.0"}){shell("settings put system font_scale "+scale);long deadline=SystemClock.uptimeMillis()+15000;float[] actual={0};do{s.onActivity(a->actual[0]=a.getResources().getConfiguration().fontScale);if(Math.abs(actual[0]-Float.parseFloat(scale))<.01)break;SystemClock.sleep(150);}while(SystemClock.uptimeMillis()<deadline);assertEquals("Android actually applied font_scale",Float.parseFloat(scale),actual[0],.01);s.recreate();waitFor(s,"window.MIRPortalActiveClient?.getStatus().phase==='ready'");for(String view:new String[]{"command","catalogue","punch"}){tap(s,"#portal-navigation [data-view="+(view.equals("catalogue")?"command":view)+"]");if(view.equals("catalogue"))tap(s,"[data-field-catalogue=material]");waitFor(s,"document.body.dataset.fieldView==="+JSONObject.quote(view.equals("command")?"catalogue":view)+" && !!document.querySelector('#portal-content button')");waitFor(s,"scaled "+view+" authorized QA metadata is rendered",fieldMetadataReady(view));presentFrame(s);JSONObject metrics=(JSONObject)js(s,"(()=>{const nav=document.querySelector('#portal-navigation').getBoundingClientRect(),buttons=[...document.querySelectorAll('#portal-content button:not(:disabled)')].filter(n=>n.getBoundingClientRect().height>0&&!n.closest('[hidden]'));return{innerWidth,innerHeight,bodyFont:getComputedStyle(document.body).fontSize,headingTextHeight:(()=>{const r=document.createRange();r.selectNodeContents(document.querySelector('#portal-content h1'));return r.getBoundingClientRect().height;})(),dense:document.body.dataset.fieldDense,documentHeight:document.documentElement.scrollHeight,buttons:buttons.map(n=>{const r=n.getBoundingClientRect();return{label:n.getAttribute('aria-label')||n.textContent.trim(),height:r.height,top:r.top,bottom:r.bottom,visible:r.top>=0&&r.bottom<=nav.top+1};})};})()");metrics.put("navigation",assertNativeNavigationText(s,view,actual[0]));assertTrue("Scaled page reports actual document bounds",metrics.getInt("documentHeight")>=metrics.getInt("innerHeight"));JSONArray buttons=metrics.getJSONArray("buttons");assertTrue(buttons.length()>0);for(int i=0;i<buttons.length();i++){JSONObject button=buttons.getJSONObject(i);assertTrue("Scaled touch target "+button.getString("label"),button.getDouble("height")>=44);}Object reachable=js(s,"(()=>{window.nativeScaledControlFailure=null;const nav=document.querySelector('#portal-navigation').getBoundingClientRect();for(const b of [...document.querySelectorAll('#portal-content button:not(:disabled)')].filter(n=>n.getBoundingClientRect().height>0)){b.scrollIntoView({block:'center',behavior:'instant'});const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2),bounds=r.height<44||r.top<64||r.bottom>nav.top+1,intercepted=!hit||(!b.contains(hit)&&b!==hit);if(bounds||intercepted){const list=b.closest('.field-store-results');window.nativeScaledControlFailure={reason:bounds?'bounds':'intercepted',label:b.getAttribute('aria-label')||b.textContent.trim(),id:b.id,className:b.className,rect:r.toJSON(),nav:nav.toJSON(),hit:hit?{tag:hit.tagName,id:hit.id,className:hit.className}:null,innerWidth,innerHeight,scrollY,documentHeight:document.documentElement.scrollHeight,dense:document.body.dataset.fieldDense,bodyFont:getComputedStyle(document.body).fontSize,list:list?{rect:list.getBoundingClientRect().toJSON(),scrollTop:list.scrollTop,scrollHeight:list.scrollHeight,clientHeight:list.clientHeight}:null};return false;}}scrollTo(0,0);return true;})()");if(Boolean.FALSE.equals(reachable))screenshot(s,"failed-controls-"+role+"-font"+scale.replace(".","")+"-"+view);assertEquals("Every scaled control remains reachable by actual document scrolling; view="+view+"; fontScale="+actual[0]+"; firstTarget="+js(s,"JSON.stringify(window.nativeScaledControlFailure)"),Boolean.TRUE,reachable);int[] zoom={0};s.onActivity(a->zoom[0]=a.getBridge().getWebView().getSettings().getTextZoom());assertEquals("WebView applies exactly one Android font factor",Math.round(actual[0]*100),zoom[0]);double bodyTextHeight=renderedBodyText(s);assertTrue("Android preference visibly enlarges inherited body text; view="+view+"; fontScale="+actual[0]+"; baseScale="+baseScale+"; baselineHeight="+baseBodyText+"; renderedHeight="+bodyTextHeight+"; currentFont="+js(s,"getComputedStyle(document.body).font"),bodyTextHeight>=baseBodyText*(actual[0]/baseScale)*.9);metrics.put("renderedBodyTextHeight",bodyTextHeight).put("baselineBodyTextHeight",baseBodyText).put("baselineHeadingTextHeight",baseHeading).put("baselineFontScale",baseScale).put("fontScale",actual[0]).put("textZoom",zoom[0]).put("view",view).put("role",role).put("screenshot",screenshot(s,"v130010-"+role+"-font"+scale.replace(".","")+"-"+view));trials.put(metrics);}}}
  finally{shell("settings put system font_scale "+original);s.recreate();waitFor(s,"window.MIRPortalActiveClient?.getStatus().phase==='ready'");}return trials;
 }
 private void writeFieldProof(String role,java.util.Map<String,JSONObject> tabs,JSONObject home,JSONObject menu,JSONObject fixture)throws Exception{
  java.util.Set<String> pngs=new java.util.HashSet<>(),contents=new java.util.HashSet<>();JSONObject screens=new JSONObject();for(java.util.Map.Entry<String,JSONObject> entry:tabs.entrySet()){assertTrue("Five distinct PNGs",pngs.add(entry.getValue().getString("sha256")));assertTrue("Five distinct body pixel frames",contents.add(entry.getValue().getString("contentSha256")));screens.put(entry.getKey(),entry.getValue());}assertEquals(5,screens.length());assertNotEquals("Account panel differs from home PNG",home.getString("sha256"),menu.getString("sha256"));assertNotEquals("Account panel differs from home content",home.getString("contentSha256"),menu.getString("contentSha256"));
  Context target=InstrumentationRegistry.getInstrumentation().getTargetContext();
  JSONObject report=new JSONObject().put("role",role).put("capture","Android system UiAutomation").put("physicalDevice",false).put("applicationId",target.getPackageName()).put("versionCode",target.getPackageManager().getPackageInfo(target.getPackageName(),0).getLongVersionCode()).put("fixture",fixture).put("screens",screens).put("home",home).put("menu",menu);File file=new File(proofDirectory(),"v130010-"+role+"-screens.json");assertFalse("Never overwrite screen manifest",file.exists());java.nio.file.Files.write(file.toPath(),report.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));
 }
 private void inspectMenu(ActivityScenario<MainActivity>s,String role)throws Exception{
  boolean field=role.equals("employe")||role.equals("chef_equipe");
  android.graphics.Rect fieldCrop=null;JSONObject homeProof=null;JSONObject fixture=null;java.util.Map<String,JSONObject> tabProofs=new java.util.LinkedHashMap<>();java.util.Set<String> contentHashes=new java.util.HashSet<>();
  if(field){
   waitFor(s,"document.body.dataset.fieldShell==='true' && !!document.querySelector('#field-header')");
   assertEquals("Accueil|Commande|Punch|Messages|Plus",js(s,"[...document.querySelectorAll('#portal-navigation button span')].map(n=>n.textContent).join('|')"));
   assertEquals(Boolean.TRUE,js(s,"!!document.querySelector('[data-field-cart]') && !!document.querySelector('[data-field-profile]')"));
   String expectedName=role.equals("chef_equipe")?"Chef MIR Recette":"Employé MIR Recette";
   waitFor(s,"(()=>{const s=MIRPortalActiveClient.getStatus().snapshot,m=s?.members?.find(m=>m.id===s.actorId);return m?.name==="+JSONObject.quote(expectedName)+" && ['7da20261-1114-4000-8000-000000000001','7da20261-1114-4000-8000-000000000002'].every(id=>s.jobs?.some(j=>j.id===id&&j.assignedMemberIds?.includes(s.actorId)));})()");
   // Choose an authorized representative job using the actual native controls.
   tap(s,"[data-field-home-job]+button");waitFor(s,"!!document.querySelector('.mir-choice-sheet[open]')");
   int qaIndex=((Number)js(s,"[...document.querySelector('[data-field-home-job]').options].findIndex(o=>o.value==='7da20261-1114-4000-8000-000000000001')")).intValue();assertTrue(qaIndex>=0);waitFor(s,"(()=>{const source=document.querySelector('[data-field-home-job]'),o=source.options["+qaIndex+"],b=document.querySelector('.mir-choice-option[data-choice-index=\""+qaIndex+"\"]');return o?.textContent.includes('QA-UX')&&/rue fictive QA/.test(o.textContent)&&b?.textContent.includes('QA-UX')&&/rue fictive QA/.test(b.textContent);})()");tap(s,".mir-choice-option[data-choice-index=\""+qaIndex+"\"]");waitFor(s,fieldContent("day"));
   tap(s,"#field-header [data-view=day]");waitFor(s,fieldContent("day"));
   if(role.equals("chef_equipe"))waitFor(s,"(()=>{const l=MIRPortalActiveClient.getStatus().snapshot.lead;return l?.selectedJobId==='7da20261-1114-4000-8000-000000000001' && l.assignment?.jobId===l.selectedJobId && l.team?.length>0 && l.tasks?.length>0;})()");
   fixture=(JSONObject)js(s,"(()=>{const s=MIRPortalActiveClient.getStatus().snapshot;return{actorId:s.actorId,name:s.members.find(m=>m.id===s.actorId).name,qaJobCount:s.jobs.filter(j=>['7da20261-1114-4000-8000-000000000001','7da20261-1114-4000-8000-000000000002'].includes(j.id)).length,selectedJobId:s.lead?.selectedJobId||'7da20261-1114-4000-8000-000000000001',teamCount:s.lead?.team?.length||0,taskCount:s.lead?.tasks?.length||0};})()");
   fieldCrop=contentArea(s);headerHashes.clear();final int[] webWidth={0};s.onActivity(a->webWidth[0]=a.getBridge().getWebView().getWidth());double headerScale=webWidth[0]/((Number)js(s,"innerWidth")).doubleValue();fixedHeader=new android.graphics.Rect(fieldCrop.left,fieldCrop.top,fieldCrop.right,Math.min(fieldCrop.bottom,fieldCrop.top+(int)Math.floor(64*headerScale)));dynamicRegions.clear();collectClockRegions(s,fieldCrop);tap(s,"#portal-navigation [data-view=punch]");waitFor(s,fieldContent("punch"));JSONObject initialClock=assertConfirmedClock(s);collectClockRegions(s,fieldCrop);tap(s,"#portal-content [data-view=punch-hours]");waitFor(s,"!!document.querySelector('.punch-hours-page [data-punch-forgot]')");tap(s,"#portal-navigation [data-view=punch]");waitFor(s,fieldContent("punch"));
   tap(s,"#portal-navigation [data-view=command]");tap(s,"[data-field-catalogue=material]");waitFor(s,"!!document.querySelector('[data-field-product]') && document.documentElement.scrollHeight<=innerHeight+1");fixture.put("nativeCompactCatalogue",assertCompactCatalogue(s,role));tap(s,"[data-field-product]");waitFor(s,"!!document.querySelector('.field-store-detail [data-product-qty]')");js(s,"(()=>{const q=document.querySelector('.field-store-detail [data-product-qty]');q.value='2';q.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");tap(s,".field-store-detail [data-add-item]");waitFor(s,"!document.querySelector('dialog[open]') && !!document.querySelector('#field-header .field-cart b')");
   tap(s,"#portal-navigation [data-view=punch]");waitFor(s,fieldContent("punch"));s.recreate();waitFor(s,"window.MIRPortalActiveClient?.getStatus().phase==='ready'");tap(s,"#portal-navigation [data-view=punch]");waitFor(s,fieldContent("punch"));JSONObject resumedClock=assertConfirmedClock(s);dynamicRegions.clear();collectClockRegions(s,fieldCrop);tap(s,"#portal-navigation [data-view=day]");waitFor(s,fieldContent("day"));collectClockRegions(s,fieldCrop);assertEquals("Recreation preserves the actual shift",initialClock.getString("id"),resumedClock.getString("id"));assertEquals(initialClock.getString("startedAt"),resumedClock.getString("startedAt"));
   for(String tab:new String[]{"day","command","punch","messages","more"}){
    tap(s,"#portal-navigation [data-view="+tab+"]");waitFor(s,fieldContent(tab));if(tab.equals("command")||tab.equals("punch"))assertEquals("Main action page has no document scrolling",Boolean.TRUE,js(s,"document.documentElement.scrollHeight<=innerHeight+1"));
    JSONObject proof=renderedScreenshot(s,"v130010-"+role+"-"+tab,fieldContent(tab),fieldCrop,contentHashes);assertTrue("Distinct presented content for "+tab,contentHashes.add(proof.getString("contentSha256")));assertTrue("Five different fixed headers outside clocks and hand",headerHashes.add(proof.getString("headerSha256")));tabProofs.put(tab,proof);
   }
   tap(s,"#portal-navigation [data-view=day]");waitFor(s,fieldContent("day"));
   homeProof=renderedScreenshot(s,"v130010-"+role+"-home",fieldContent("day"),fieldCrop,java.util.Collections.emptySet());
   tap(s,"#portal-navigation [data-view=command]");
   openFieldDrawing(s);
   waitFor(s,"Pliages choice opens drawing and all four steps","(()=>{const f=document.querySelector('#field-drawing-frame'),d=f?.contentDocument,w=f?.contentWindow,steps=[...d?.querySelectorAll('#client-step-list button')||[]];return !!w?.MIRFieldChoices&&w.MIRProductionWorkspace?.getLivePreviewState().tool==='draw'&&d.body.dataset.clientEntry==='draw'&&d.body.dataset.clientStage==='1'&&d.body.classList.contains('mir-pliage03')&&steps.length===4&&steps.every(n=>n.getBoundingClientRect().width>0&&n.getBoundingClientRect().height>0);})()");
   waitFor(s,"fresh native drawing starts with no points","document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length===0");
   JSONArray initialGestures=new JSONArray();double[][] initialPoints={{2,2},{6,2},{6,5}};
   try{for(int i=0;i<initialPoints.length;i++){compactTracePointIndex=i+1;initialGestures.put(tapDrawingGrid(s,initialPoints[i][0],initialPoints[i][1]));waitFor(s,"native touchscreen creates L point "+(i+1),"document.querySelector('#field-drawing-frame').contentWindow.MIRProductionWorkspace.getLivePreviewState().drawPointsMM.length==="+(i+1));}}finally{compactTracePointIndex=0;}
   JSONObject compactPliage=role.equals("employe")?prepareCompactTrace(s,role):null;
   fixture.put("nativePliageTrace",assertNativeTraceExpansion(s,role).put("initialGestures",initialGestures));
   js(s,"(()=>{const f=document.querySelector('#field-drawing-frame'),m=f.contentWindow.MIRProductionWorkspace.getLivePreviewState().model;window.nativePliageGeometry=JSON.stringify({points:m.pointsMM,bends:m.bends});window.nativePliageCartIds=MIRUnifiedOrderCart.list().map(x=>x.id);window.nativePliageContext=MIRFieldDrawingContext();return true;})()");
   screenshot(s,"v130010-"+role+"-pliage-1-drawing");
   waitFor(s,"drawing trace scale MIR facade ready","!!document.querySelector('#field-drawing-frame')?.contentDocument.querySelector('#trace-height+button')");
   tapDrawing(s,"#trace-height+button");
   waitFor(s,"drawing MIR choice opened by native tap","document.querySelector('#field-drawing-frame')?.contentWindow.MIRFieldChoices.isOpen()===true");
   js(s,"window.nativeDrawingFrame=document.querySelector('#field-drawing-frame');window.nativeDrawingDocument=nativeDrawingFrame.contentDocument;window.nativeDrawingValue=nativeDrawingDocument.querySelector('#trace-height').value;true");
   androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
   waitFor(s,"native Back closes only child choice and restores child focus","(()=>{const f=document.querySelector('#field-drawing-frame'),d=f?.contentDocument;return !!f && f===window.nativeDrawingFrame && d===window.nativeDrawingDocument && !!f.contentWindow?.MIRFieldChoices && !f.contentWindow.MIRFieldChoices.isOpen() && d.activeElement===d.querySelector('#trace-height+button') && d.querySelector('#trace-height')?.value===window.nativeDrawingValue;})()");
   tapDrawing(s,".draw-primary[data-draw-tool=draw]");
   waitFor(s,"native Pliage03 measurements stage","document.querySelector('#field-drawing-frame')?.contentDocument.body.dataset.clientStage==='2'");
   if(compactPliage!=null){fixture.put("nativePliageCompact",assertCompactPliage(s,role,compactPliage));js(s,"(()=>{const f=document.querySelector('#field-drawing-frame'),m=f.contentWindow.MIRProductionWorkspace.getLivePreviewState().model;window.nativePliageGeometry=JSON.stringify({points:m.pointsMM,bends:m.bends});window.nativePliageCartIds=MIRUnifiedOrderCart.list().map(x=>x.id);window.nativePliageContext=MIRFieldDrawingContext();return true;})()");}
   screenshot(s,"v130010-"+role+"-pliage-2-measures");
   tapDrawing(s,"#client-step-next");
   waitFor(s,"native Pliage03 finish stage","document.querySelector('#field-drawing-frame')?.contentDocument.body.dataset.clientStage==='3'");
   chooseDrawingOption(s,"#material-type","aluminium");
   chooseDrawingOption(s,"#production-material","kaycan-coil-0721-30m");
   String color=(String)js(s,"[...document.querySelector('#field-drawing-frame').contentDocument.querySelectorAll('[data-production-color]')].find(n=>n.textContent.includes('Sable'))?.dataset.productionColor");
   assertNotNull("Actual manufacturer's Sable colour available",color);tapDrawing(s,"[data-production-color="+JSONObject.quote(color)+"]");
   tapDrawing(s,"[data-client-face=left]");
   waitFor(s,"painted left surface selected","(()=>{const f=document.querySelector('#field-drawing-frame');return f?.contentWindow.MIRProductionWorkspace.getLivePreviewState().model.coloredFace.side==='left'&&f.contentDocument.querySelector('#production-drawing .mir-pliage-painted-surface')?.dataset.paintedSide==='left';})()");
   String leftSurface=(String)js(s,"document.querySelector('#field-drawing-frame').contentDocument.querySelector('#production-drawing .mir-pliage-painted-surface').getAttribute('d')");
   tapDrawing(s,"[data-client-face=right]");
   waitFor(s,"painted right surface selected without geometry change","(()=>{const f=document.querySelector('#field-drawing-frame'),m=f?.contentWindow.MIRProductionWorkspace.getLivePreviewState().model;return m?.coloredFace.side==='right'&&m.finish.name==='Sable'&&JSON.stringify({points:m.pointsMM,bends:m.bends})===window.nativePliageGeometry&&f.contentDocument.querySelector('#production-drawing .mir-pliage-painted-surface')?.dataset.paintedSide==='right';})()");
   assertNotEquals("Changing painted side changes the actual surface path",leftSurface,js(s,"document.querySelector('#field-drawing-frame').contentDocument.querySelector('#production-drawing .mir-pliage-painted-surface').getAttribute('d')"));
   screenshot(s,"v130010-"+role+"-pliage-3-finish");
   tapDrawing(s,"#client-step-next");
   waitFor(s,"native Pliage03 review requires quantity","(()=>{const d=document.querySelector('#field-drawing-frame')?.contentDocument;return d?.body.dataset.clientStage==='4'&&d.querySelector('#production-quantity')?.value===''&&d.querySelector('#client-step-next')?.disabled;})()");
   tapDrawing(s,"#production-quantity");
   assertTrue("Native quantity key delivered",androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressKeyCode(android.view.KeyEvent.KEYCODE_2));
   waitFor(s,"native quantity enables add to own cart","(()=>{const d=document.querySelector('#field-drawing-frame')?.contentDocument;return d?.querySelector('#production-quantity')?.value==='2'&&!d.querySelector('#client-step-next')?.disabled;})()");
   screenshot(s,"v130010-"+role+"-pliage-4-review");
   tapDrawing(s,"#client-step-next");
   waitFor(s,"native Pliage03 piece added locally","!!document.querySelector('#field-drawing-frame')?.contentDocument.querySelector('#production-dialog[open] a.primary-button')");
   JSONObject pliage=(JSONObject)js(s,"(()=>{const c=window.nativePliageContext,added=MIRUnifiedOrderCart.list().filter(x=>!window.nativePliageCartIds.includes(x.id)),line=added[0];window.nativePliageLineId=line?.id;return{count:added.length,owner:line?.ownerId,job:line?.jobId,expectedOwner:c.ownerId,expectedJob:c.jobId,quantity:line?.quantity,geometryPreserved:JSON.stringify(line?.snapshot.geometry.pointsMM)===JSON.stringify(JSON.parse(window.nativePliageGeometry).points),finish:line?.snapshot.spec.finish.name,paintedSide:line?.snapshot.spec.coloredFace.side};})()");
   assertEquals("Exactly one local fabrication line",1,pliage.getInt("count"));assertEquals(pliage.getString("expectedOwner"),pliage.getString("owner"));assertEquals(pliage.getString("expectedJob"),pliage.getString("job"));assertEquals(2,pliage.getInt("quantity"));assertTrue(pliage.getBoolean("geometryPreserved"));assertEquals("Sable",pliage.getString("finish"));assertEquals("right",pliage.getString("paintedSide"));
   tapDrawing(s,"#production-dialog[open] a.primary-button");
   waitFor(s,"native return to own parent cart","document.body.dataset.fieldView==='catalogue'&&!document.querySelector('#field-drawing-frame')&&document.querySelector('#portal-content h1')?.textContent==='Mon panier'&&[...document.querySelectorAll('#order-cart [data-cart-qty]')].some(n=>n.dataset.cartQty===window.nativePliageLineId&&n.value==='2')");
   waitFor(s,"authorized job choice is available at checkout","(()=>{const context=document.querySelector('#create-order-form .field-cart-context'),job=context?.querySelector('#order-job'),reference=context?.querySelector('#order-job-reference');return !!context?.getClientRects().length&&job?.value===window.nativePliageContext.jobId&&(!reference||reference.required&&reference.name==='jobReference');})()");
   js(s,"window.nativeCartBeforeDestination=JSON.stringify([...document.querySelectorAll('#order-cart [data-cart-qty]')].map(n=>[n.dataset.cartQty,n.value]).sort());true");
   tap(s,"#order-job+button");waitFor(s,"checkout destination choice opens","!!document.querySelector('.mir-choice-sheet[open]')");int destinationIndex=((Number)js(s,"[...document.querySelector('#order-job').options].findIndex(o=>o.value==='7da20261-1114-4000-8000-000000000002')")).intValue();assertTrue("Second authorized QA destination exists",destinationIndex>=0);tap(s,".mir-choice-sheet[open] [data-choice-index=\""+destinationIndex+"\"]");
   String destinationRows="document.querySelector('#order-job')?.value==='7da20261-1114-4000-8000-000000000002'&&JSON.stringify([...document.querySelectorAll('#order-cart [data-cart-qty]')].map(n=>[n.dataset.cartQty,n.value]).sort())===window.nativeCartBeforeDestination";
   String sourceLineScope="(()=>{const line=MIRUnifiedOrderCart.list().find(row=>row.id===window.nativePliageLineId),source=window.nativePliageContext;return !!line&&line.ownerId===source.ownerId&&line.jobId===source.jobId;})()";
   waitFor(s,"changing destination preserves all source cart lines and their owner/job",destinationRows+"&&"+sourceLineScope);
   assertEquals("Drawing context is unavailable outside the drawing view",null,js(s,"MIRFieldDrawingContext()"));
   // Observe the source scope through the real drawing route. The restricted
   // drawing API intentionally returns null while the cart is displayed.
   tap(s,"#portal-navigation [data-view=command]");waitFor(s,fieldContent("command"));openFieldDrawing(s);
   waitFor(s,"reopened drawing retains the source owner and job","(()=>{const frame=document.querySelector('#field-drawing-frame'),context=MIRFieldDrawingContext(),source=window.nativePliageContext;return !!frame?.contentWindow.MIRProductionWorkspace&&context?.personal===true&&context.ownerId===source.ownerId&&context.jobId===source.jobId;})()");
   JSONObject reopenedSource=(JSONObject)js(s,"(()=>{const context=MIRFieldDrawingContext(),source=window.nativePliageContext;return{ownerId:context.ownerId,jobId:context.jobId,unchanged:context.personal===true&&context.ownerId===source.ownerId&&context.jobId===source.jobId};})()");
   assertTrue("Real drawing round trip preserves source context",reopenedSource.getBoolean("unchanged"));
   screenshot(s,"v130010-"+role+"-pliage-source-context-restored");
   tap(s,"#field-header [data-field-cart]");
   waitFor(s,"returning through the cart icon retains destination and all source lines","document.querySelector('#portal-content h1')?.textContent==='Mon panier'&&!document.querySelector('#field-drawing-frame')&&"+destinationRows+"&&"+sourceLineScope);
   assertEquals("Cart does not expose a drawing context",null,js(s,"MIRFieldDrawingContext()"));
   JSONObject destinationChoice=(JSONObject)js(s,"({sourceJob:window.nativePliageContext.jobId,destinationJob:document.querySelector('#order-job').value,sourceLinesPreserved:JSON.stringify([...document.querySelectorAll('#order-cart [data-cart-qty]')].map(n=>[n.dataset.cartQty,n.value]).sort())===window.nativeCartBeforeDestination,lineCount:document.querySelectorAll('#order-cart [data-cart-qty]').length})");
   destinationChoice.put("sourceContextUnchanged",reopenedSource.getBoolean("unchanged")).put("reopenedDrawingContext",reopenedSource).put("sourceLineScopePreserved",js(s,sourceLineScope));pliage.put("destinationChoice",destinationChoice);
   screenshot(s,"v130010-"+role+"-pliage-parent-cart");fixture.put("nativePliageJourney",pliage);
   tap(s,"#portal-navigation [data-view=day]");waitFor(s,fieldContent("day"));
   fixture.put("androidFontScaleTrials",assertAndroidFontScales(s,role));tap(s,"#portal-navigation [data-view=day]");waitFor(s,fieldContent("day"));tap(s,"[data-field-profile]");waitFor(s,"document.querySelector('#portal-dialog')?.open===true && document.querySelector('#portal-dialog h2')?.textContent==="+JSONObject.quote(expectedName));
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
  if(field){JSONObject menuProof=renderedScreenshot(s,"v130010-"+role+"-menu","document.querySelector('#portal-dialog')?.open===true && !!document.querySelector('#portal-dialog [data-view=settings]') && !!document.querySelector('#portal-dialog #portal-signout')",fieldCrop,java.util.Collections.singleton(homeProof.getString("contentSha256")));writeFieldProof(role,tabProofs,homeProof,menuProof,fixture);}else screenshot(s,"v130010-"+role+"-menu");
  if(field){tap(s,"[data-close-dialog]");waitFor(s,fieldContent("day"));}else tap(s,".mir-harmony-toggle");
  if(!field)screenshot(s,"v130010-"+role+"-home");
  if(field){tap(s,"[data-field-profile]");waitFor(s,"document.querySelector('#portal-dialog')?.open===true");tap(s,"#portal-dialog [data-view=settings]");}else tap(s,"[data-view=settings]");
  waitFor(s,"!!document.querySelector('#harmony-settings-form') && document.querySelector('.settings-status')?.textContent==='Enregistré dans votre compte MIR'");
  js(s,"scrollTo(0,0);true");screenshot(s,"v130010-"+role+"-settings");
  if(role.equals("employe")){
   js(s,"document.querySelector('#portal-navigation [data-view=more]').click();true");
   waitFor(s,"document.querySelector('#portal-navigation [data-view=more]')?.getAttribute('aria-current')==='page' && !!document.querySelector('#portal-content [data-view=absences]')");
   js(s,"document.querySelector('#portal-content [data-view=absences]').click();true");
   waitFor(s,"!!document.querySelector('#absence-draft-form') && !!document.querySelector('.absence-compose summary')");
   js(s,"document.querySelector('.absence-compose summary').click();true");
   waitFor(s,"document.querySelector('.absence-compose')?.open===true && document.querySelector('#absence-draft-form textarea[name=note]')?.getClientRects().length>0");
   js(s,"scrollTo(0,0);true");screenshot(s,"v130010-employee-absence-form");
   js(s,"(()=>{const n=document.querySelector('#absence-draft-form textarea[name=note]');n.value='RECETTE-PHASE11-VISUEL-LOCAL';n.dispatchEvent(new Event('input',{bubbles:true}));n.scrollIntoView({block:'center'});})()");
   assertEquals("RECETTE-PHASE11-VISUEL-LOCAL",js(s,"document.querySelector('#absence-draft-form textarea[name=note]').value"));
   screenshot(s,"v130010-employee-local-note");
   androidx.test.uiautomator.UiDevice device=androidx.test.uiautomator.UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());device.pressBack();
   androidx.test.uiautomator.UiObject2 cancel=device.wait(androidx.test.uiautomator.Until.findObject(androidx.test.uiautomator.By.res("android:id/button2")),5000);
   assertNotNull("Android back requires confirmation for local input",cancel);screenshotSystem("v130010-employee-back-confirmation");cancel.click();
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
    JSONObject role=roles.getJSONObject(i);js(s,"window.realRoleIndex="+i+";window.realExpectedRole="+JSONObject.quote(role.getString("role"))+";true");String email=JSONObject.quote(role.getString("email")),password=JSONObject.quote(role.getString("password"));
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
     if(role.getString("role").equals("assistant")||role.getString("role").equals("boss")){
      tap(s,".mir-harmony-toggle");waitFor(s,"document.querySelector('#mir-harmony-menu')?.hidden===false");tap(s,"#portal-navigation [data-view=management-more]");tap(s,"#portal-content [data-view=punch-admin]");
      waitFor(s,"management Punch snapshot is rendered from the TEST RPC", "(()=>{const p=document.querySelector('.pm-page');return p?.dataset.pmAsOf&&Number.isFinite(Date.parse(p.dataset.pmAsOf))&&['3980647a-d83a-48ad-9d90-8fc2b314807f','ec421778-b39b-492e-9e4b-5e044015e98f'].every(id=>!!p.querySelector('[data-pm-detail=\"'+id+'\"]'));})()");
      js(s,"window.nativeManagementPeople=[...document.querySelectorAll('.pm-person .pm-name')].map(n=>n.dataset.pmDetail);true");
      for(String[] target:new String[][]{{"3980647a-d83a-48ad-9d90-8fc2b314807f","Employé MIR Recette"},{"ec421778-b39b-492e-9e4b-5e044015e98f","Chef MIR Recette"}}){
       js(s,"(()=>{const n=document.querySelector('[data-pm-search]');n.value="+JSONObject.quote(target[1])+";n.dispatchEvent(new Event('input',{bubbles:true}));return true;})()");
       waitFor(s,"unique QA employee search includes its ID/name and excludes every other employee", "(()=>{const id="+JSONObject.quote(target[0])+",name="+JSONObject.quote(target[1])+",rows=[...document.querySelectorAll('.pm-person')],n=rows[0]?.querySelector('.pm-name');return rows.length===1&&n?.dataset.pmDetail===id&&n.textContent.trim()===name&&window.nativeManagementPeople?.includes(id)&&window.nativeManagementPeople.filter(other=>other!==id).every(other=>![...document.querySelectorAll('.pm-person .pm-name')].some(n=>n.dataset.pmDetail===other));})()");
      }
      js(s,"document.activeElement?.blur();true");
      s.onActivity(a->{android.webkit.WebView web=a.getBridge().getWebView();android.view.inputmethod.InputMethodManager ime=(android.view.inputmethod.InputMethodManager)a.getSystemService(android.content.Context.INPUT_METHOD_SERVICE);ime.hideSoftInputFromWindow(web.getWindowToken(),0);});
      long keyboardDeadline=SystemClock.uptimeMillis()+10000;boolean[] keyboardHidden={false};
      while(SystemClock.uptimeMillis()<keyboardDeadline){s.onActivity(a->{androidx.core.view.WindowInsetsCompat insets=androidx.core.view.ViewCompat.getRootWindowInsets(a.getBridge().getWebView());keyboardHidden[0]=insets!=null&&!insets.isVisible(androidx.core.view.WindowInsetsCompat.Type.ime());});if(keyboardHidden[0])break;SystemClock.sleep(100);}
      assertTrue("Android keyboard is hidden before management capture",keyboardHidden[0]);
      js(s,"document.querySelector('.pm-person').scrollIntoView({block:'center',behavior:'instant'});true");
      waitFor(s,"complete QA management card is visible without clipping", "(()=>{const r=document.querySelector('.pm-person')?.getBoundingClientRect(),v=visualViewport;return !!r&&r.top>=0&&r.left>=0&&r.bottom<=(v?.height||innerHeight)&&r.right<=(v?.width||innerWidth)&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName);})()");
      presentFrame(s);screenshot(s,"teams-hours-"+role.getString("role")+"-http-snapshot");
     }

     // Foreign organisation is rejected by the existing server contract.
     js(s,"window.realProof='pending';MIRSupabase.createClient(MIRPortalConfig.supabaseUrl,MIRPortalConfig.publishableKey).rpc('mir_employee_operations_snapshot',{org:'00000000-0000-4000-8000-000000000011',job:null}).then(r=>window.realProof=r.error?.code==='42501'?'denied':'unexpected');true");waitFor(s,"window.realProof==='denied'");
    }
    js(s,"window.realProof='pending';MIRPortalActiveClient.signOut().then(()=>window.realProof='out');true");waitFor(s,"window.realProof==='out'");assertEquals(null,js(s,"MIRPortalActiveClient.getStatus().snapshot"));
   }
  }finally{assertTrue(credentials.delete());}
 }
}
