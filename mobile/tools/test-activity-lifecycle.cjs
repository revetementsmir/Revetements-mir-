'use strict';
// Exercise the actual Activity teardown bodies against the dependency's two
// lifecycle callbacks. This host test does not claim an Android WebView result;
// the instrumented LockManager test supplies that separate, required proof.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),before=fs.readFileSync(path.join(__dirname,'fixtures/native-activity/MainActivity.347e.java'),'utf8'),current=fs.readFileSync(path.join(root,'android/app/src/main/java/ca/revetementsmir/equipe/test/MainActivity.java'),'utf8');
assert.equal(crypto.createHash('sha256').update(before).digest('hex'),'08b897e3c74b4641a88ab1f0237d75bb99c9cd03dfc6a2fb406432d96fd28318');
function teardown(source){
 const fields=source.match(/private boolean bridgeWebViewDestroyed[^;]*;/)?.[0]||'';
 return fields+['onDestroy','onDetachedFromWindow'].map(name=>{
  const start=source.indexOf('@Override public void '+name+'()');if(start<0)return '';
  let end=source.indexOf('{',start)+1,depth=1;for(;end<source.length&&depth;end++){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;}
  assert.equal(depth,0,'Complete actual Java lifecycle method');return source.slice(start,end);
 }).join('\n');
}
const common={
 'android/view/ViewGroup.java':`package android.view;public class ViewGroup{public int removed;public void removeView(Object child){removed++;}}`,
 'android/webkit/WebView.java':`package android.webkit;public class WebView{public android.view.ViewGroup parent=new android.view.ViewGroup();public int destroys;public boolean javascriptAlive=true;public Object getParent(){return parent;}public void removeAllViews(){}public void destroy(){destroys++;javascriptAlive=false;}}`,
 'BridgeActivity.java':`class Bridge{final android.webkit.WebView web=new android.webkit.WebView();boolean pluginsStopped;int detaches;android.webkit.WebView getWebView(){return web;}void onDestroy(){pluginsStopped=true;}void onDetachedFromWindow(){detaches++;web.removeAllViews();web.destroy();}}
class BridgeActivity{protected Bridge bridge=new Bridge();int windowCallbacks;public void onDestroy(){if(bridge!=null)bridge.onDestroy();}public void onDetachedFromWindow(){windowCallbacks++;if(bridge!=null)bridge.onDetachedFromWindow();}}`,
 'LifecycleProbe.java':`public class LifecycleProbe{
 static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 public static void main(String[] ignored){
  MainActivity retained=new MainActivity();Bridge a=retained.bridge;retained.onDestroy();
  check(a.pluginsStopped,"Capacitor plugin teardown must run");check(!a.web.javascriptAlive,"retained window left old JavaScript alive");check(a.web.destroys==1,"retained document destroyed once");check(a.web.parent.removed==1,"old WebView detached from its parent");
  retained.onDetachedFromWindow();check(a.web.destroys==1,"late detach must not destroy twice");check(retained.windowCallbacks==1,"Activity detach superclass must still run");
  MainActivity detached=new MainActivity();Bridge b=detached.bridge;detached.onDetachedFromWindow();detached.onDestroy();check(b.pluginsStopped,"early detach must preserve plugin teardown");check(b.web.destroys==1,"early detach must not destroy twice");
  MainActivity other=new MainActivity();Bridge c=other.bridge;check(c.web.javascriptAlive&&c.web.destroys==0,"another Activity's document must remain alive");
  System.out.println("PASS retained-window, late-detach, early-detach and independent-Activity lifecycle contracts");
 }
}`};
const javaHome=process.env.JAVA_HOME||(fs.existsSync('/tmp/mir-jdk21/bin/javac')?'/tmp/mir-jdk21':null),java=name=>javaHome?path.join(javaHome,'bin',name):name;
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mir-activity-lifecycle-'));
try{
 for(const [label,source]of [['red-347e',before],['current',current]]){
  const dir=path.join(tmp,label);fs.mkdirSync(dir,{recursive:true});
  for(const [name,content]of Object.entries({...common,'MainActivity.java':`import android.webkit.WebView;class MainActivity extends BridgeActivity{${teardown(source)}}`})){
   const file=path.join(dir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);
  }
  const compile=spawnSync(java('javac'),['-d',dir,...Object.keys({...common,'MainActivity.java':''}).map(name=>path.join(dir,name))],{encoding:'utf8'});assert.equal(compile.status,0,compile.stderr||compile.error?.message);
  const result=spawnSync(java('java'),['-cp',dir,'LifecycleProbe'],{encoding:'utf8'});
  if(label==='red-347e'){assert.notEqual(result.status,0);assert.match(result.stderr,/retained window left old JavaScript alive/);console.log('RED original 347e: stopped plugin thread leaves its retained JavaScript document alive');}
  else{assert.equal(result.status,0,result.stderr);process.stdout.write(result.stdout);}
 }
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
