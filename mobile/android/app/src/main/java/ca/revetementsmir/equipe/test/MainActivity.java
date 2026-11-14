package ca.revetementsmir.equipe.test;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.content.Intent;
import java.io.ByteArrayInputStream;

public class MainActivity extends BridgeActivity {
    private boolean bridgeWebViewDestroyed=false;
    @Override public void onCreate(Bundle state) {
        registerPlugin(MIRNativePlugin.class);
        super.onCreate(state);
        // Apply Android accessibility once, as an absolute value. MIR text preference remains independent.
        getBridge().getWebView().getSettings().setTextZoom(Math.round(getResources().getConfiguration().fontScale * 100));
        getBridge().getWebView().getSettings().setAllowFileAccess(false);
        getBridge().getWebView().getSettings().setAllowContentAccess(false);
        getBridge().getWebView().getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        openDeviceRecipe(getIntent());
    }
    private void openDeviceRecipe(Intent intent) {
        if((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0 && intent!=null && "ca.revetementsmir.equipe.test.CHECK_DEVICE".equals(intent.getAction()))
            getBridge().getWebView().loadUrl("https://localhost/native-checks.html");
    }
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); openDeviceRecipe(intent); }
    @Override public void onDetachedFromWindow() {
        super.onDetachedFromWindow();
        bridgeWebViewDestroyed=true;
    }
    @Override public void onDestroy() {
        super.onDestroy();
        // A configuration recreation can preserve the window without a detach.
        // Capacitor has stopped its plugin thread: its old document must end too.
        if(bridge!=null){
            if(!bridgeWebViewDestroyed){
                WebView web=bridge.getWebView();
                if(web.getParent() instanceof android.view.ViewGroup)((android.view.ViewGroup)web.getParent()).removeView(web);
                bridge.onDetachedFromWindow();
                bridgeWebViewDestroyed=true;
            }
            // A later window detach must not destroy the same WebView twice.
            bridge=null;
        }
    }
    @Override protected void load() {
        super.load();
        if(getBridge().getServerUrl()!=null)throw new SecurityException("Ressources MIR embarquées obligatoires");
        getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if(!MirPolicy.request(request.getUrl().toString()) || request.isForMainFrame() && !MirPolicy.navigation(request.getUrl().toString()))return new WebResourceResponse("text/plain","UTF-8",403,"MIR TEST only",java.util.Collections.emptyMap(),new ByteArrayInputStream(new byte[0]));
                return super.shouldInterceptRequest(view,request);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url=request.getUrl().toString();
                if(MirPolicy.navigation(url))return false;
                if(request.hasGesture()&&MirPolicy.external(url))try{startActivity(new Intent(Intent.ACTION_VIEW,request.getUrl()));}catch(Exception ignored){}
                return true;
            }
        });
    }
}
