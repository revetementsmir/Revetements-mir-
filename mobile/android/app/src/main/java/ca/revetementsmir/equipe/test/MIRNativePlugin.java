package ca.revetementsmir.equipe.test;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import com.google.zxing.integration.android.IntentIntegrator;
import com.google.zxing.integration.android.IntentResult;
import java.io.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.UUID;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name="MIRNative",permissions={@Permission(alias="camera",strings={Manifest.permission.CAMERA})})
public class MIRNativePlugin extends Plugin {
    private static final int MAX=20*1024*1024;
    private boolean trusted(PluginCall call){
        java.util.concurrent.atomic.AtomicBoolean local=new java.util.concurrent.atomic.AtomicBoolean(false);
        java.util.concurrent.CountDownLatch latch=new java.util.concurrent.CountDownLatch(1);
        getActivity().runOnUiThread(()->{local.set(MirPolicy.local(getBridge().getWebView().getUrl()));latch.countDown();});
        try{if(!latch.await(2,java.util.concurrent.TimeUnit.SECONDS))throw new SecurityException();}catch(Exception e){call.reject("Origine MIR indisponible");return false;}
        if(!local.get()||getBridge().getServerUrl()!=null){call.reject("Origine MIR refusée");return false;}
        return true;
    }
    private File authFile(){return new File(getContext().getNoBackupFilesDir(),"mir-auth.enc");}
    private byte[] readFile(File file)throws IOException{try(FileInputStream input=new FileInputStream(file);ByteArrayOutputStream output=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=input.read(buffer))!=-1){if(output.size()+n>MAX)throw new IOException();output.write(buffer,0,n);}return output.toByteArray();}}
    private javax.crypto.SecretKey key() throws Exception {
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias("mir-test-auth-v1")){
            KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
            generator.init(new KeyGenParameterSpec.Builder("mir-test-auth-v1",KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generator.generateKey();
        }
        return (javax.crypto.SecretKey)store.getKey("mir-test-auth-v1",null);
    }
    @PluginMethod public void readAuth(PluginCall call){if(!trusted(call))return;try{
        JSObject result=new JSObject();File file=authFile();
        if(file.exists()){
            byte[] bytes=new AtomicFile(file).readFully();if(bytes.length<29||bytes.length>100000)throw new IOException();
            byte[] iv=new byte[12];System.arraycopy(bytes,0,iv,0,12);Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,iv));
            result.put("value",new String(cipher.doFinal(bytes,12,bytes.length-12),StandardCharsets.UTF_8));
        }
        call.resolve(result);
    }catch(Exception e){call.reject("Session locale illisible. Reconnectez-vous.");}}
    @PluginMethod public void writeAuth(PluginCall call){if(!trusted(call))return;String value=call.getString("value");if(value==null||value.length()>65536){call.reject("Session invalide");return;}AtomicFile file=new AtomicFile(authFile());FileOutputStream output=null;try{
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());byte[] ciphertext=cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
        output=file.startWrite();output.write(cipher.getIV());output.write(ciphertext);file.finishWrite(output);call.resolve();
    }catch(Exception e){if(output!=null)file.failWrite(output);call.reject("Session non conservée sur cet appareil");}}
    private void clean(File dir,boolean all){File[] files=dir.listFiles();if(files!=null)for(File f:files)if(all||System.currentTimeMillis()-f.lastModified()>86400000L)f.delete();}
    @PluginMethod public void clearAuth(PluginCall call){if(!trusted(call))return;new AtomicFile(authFile()).delete();clean(new File(getContext().getCacheDir(),"mir-pdf"),true);clean(new File(getContext().getCacheDir(),"mir-capture"),true);getActivity().runOnUiThread(()->{getBridge().getWebView().clearHistory();getBridge().getWebView().clearCache(true);android.webkit.CookieManager.getInstance().removeAllCookies(removed->{android.webkit.CookieManager.getInstance().flush();call.resolve();});});}
    @PluginMethod public void clearTemporary(PluginCall call){if(!trusted(call))return;clean(new File(getContext().getCacheDir(),"mir-pdf"),false);clean(new File(getContext().getCacheDir(),"mir-capture"),false);call.resolve();}
    @PluginMethod public void openExternal(PluginCall call){if(!trusted(call))return;String url=call.getString("url");if(!MirPolicy.external(url)){call.reject("Lien externe refusé");return;}try{getActivity().startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));call.resolve();}catch(Exception e){call.reject("Aucun navigateur disponible");}}
    @PluginMethod public void pdf(PluginCall call){if(!trusted(call))return;try{
        String encoded=call.getString("data"),name=call.getString("name","MIR.pdf"),action=call.getString("action","open");
        if(encoded==null||encoded.length()>MAX*4/3+8)throw new IOException();byte[] bytes=Base64.decode(encoded,Base64.DEFAULT);
        if(bytes.length<5||bytes.length>MAX||!new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-")||!name.toLowerCase(java.util.Locale.ROOT).endsWith(".pdf")||!(action.equals("open")||action.equals("share")||action.equals("save")))throw new IOException();
        File dir=new File(getContext().getCacheDir(),"mir-pdf");dir.mkdirs();clean(dir,false);
        String safe=name.replaceAll("[^\\p{L}\\p{N}._ -]","-");if(safe.length()>120)safe="MIR.pdf";
        File file=new File(dir,UUID.randomUUID()+"-"+safe);try(FileOutputStream out=new FileOutputStream(file)){out.write(bytes);}
        if(action.equals("save")){call.getData().put("pdfSaveName",file.getName());Intent save=new Intent(Intent.ACTION_CREATE_DOCUMENT);save.addCategory(Intent.CATEGORY_OPENABLE);save.setType("application/pdf");save.putExtra(Intent.EXTRA_TITLE,safe);startActivityForResult(call,save,"pdfSaved");return;}
        Uri uri=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",file);
        Intent intent=new Intent(action.equals("share")?Intent.ACTION_SEND:Intent.ACTION_VIEW);intent.setType("application/pdf");
        if(action.equals("share")){intent.putExtra(Intent.EXTRA_STREAM,uri);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);getActivity().startActivity(Intent.createChooser(intent,"Partager le PDF"));}
        else getActivity().runOnUiThread(()->getBridge().getWebView().loadUrl("https://localhost/native-pdf.html?id="+Uri.encode(file.getName())));
        call.resolve();
    }catch(Exception e){call.reject("PDF indisponible ou aucun lecteur installé. Aucun fichier envoyé.");}}
    @ActivityCallback private void pdfSaved(PluginCall call,ActivityResult activity){if(call!=null)getBridge().execute(()->finishPdfSave(call,activity));}
    private void finishPdfSave(PluginCall call,ActivityResult activity){String name=call.getString("pdfSaveName","");if(!name.matches("[a-f0-9-]{36}-[^/\\\\]{1,120}\\.pdf")){call.reject("Document refusé");return;}File file=new File(new File(getContext().getCacheDir(),"mir-pdf"),name);try{
        if(activity.getResultCode()!=Activity.RESULT_OK||activity.getData()==null){call.resolve(new JSObject().put("cancelled",true));return;}
        Uri uri=activity.getData().getData();if(uri==null||!"content".equals(uri.getScheme()))throw new IOException();byte[] bytes=readFile(file);if(bytes.length<5||!new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-"))throw new IOException();
        try(OutputStream output=getContext().getContentResolver().openOutputStream(uri,"wt")){if(output==null)throw new IOException();output.write(bytes);output.flush();}call.resolve(new JSObject().put("saved",true));
    }catch(Exception e){call.reject("Enregistrement non confirmé. Vérifiez le fichier choisi.");}finally{file.delete();}}
    @PluginMethod public void scanQr(PluginCall call){if(!trusted(call))return;if(getPermissionState("camera")!=PermissionState.GRANTED){requestPermissionForAlias("camera",call,"cameraReady");return;}launchScanner(call);}
    @PermissionCallback private void cameraReady(PluginCall call){if(getPermissionState("camera")!=PermissionState.GRANTED){call.reject("Caméra refusée. Utilisez le sélecteur ou le code saisi.");return;}if(call.getMethodName().equals("capturePhoto"))launchPhoto(call);else launchScanner(call);}
    @PluginMethod public void readPdf(PluginCall call){if(!trusted(call))return;try{
        String id=call.getString("id","");if(!id.matches("[a-f0-9-]{36}-[^/\\\\]{1,120}\\.pdf"))throw new IOException();
        File file=new File(new File(getContext().getCacheDir(),"mir-pdf"),id);if(file.length()<5||file.length()>MAX)throw new IOException();
        byte[] bytes=readFile(file);if(!new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-"))throw new IOException();
        call.resolve(new JSObject().put("data",Base64.encodeToString(bytes,Base64.NO_WRAP)));
    }catch(Exception e){call.reject("PDF privé introuvable. Rechargez-le depuis sa commande.");}}
    @PluginMethod public void capturePhoto(PluginCall call){if(!trusted(call))return;if(getPermissionState("camera")!=PermissionState.GRANTED){requestPermissionForAlias("camera",call,"cameraReady");return;}launchPhoto(call);}
    private void launchPhoto(PluginCall call){try{
        File dir=new File(getContext().getCacheDir(),"mir-capture");dir.mkdirs();File file=File.createTempFile("capture-",".jpg",dir);call.getData().put("captureName",file.getName());
        Uri uri=FileProvider.getUriForFile(getContext(),getContext().getPackageName()+".fileprovider",file);Intent intent=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);intent.putExtra(MediaStore.EXTRA_OUTPUT,uri);intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);startActivityForResult(call,intent,"photoResult");
    }catch(Exception e){call.reject("Appareil photo indisponible. Utilisez le sélecteur de fichiers.");}}
    @ActivityCallback private void photoResult(PluginCall call,ActivityResult activity){if(call==null)return;File file=new File(new File(getContext().getCacheDir(),"mir-capture"),call.getString("captureName","absent"));try{
        if(activity.getResultCode()!=Activity.RESULT_OK){call.resolve(new JSObject().put("cancelled",true));return;}
        if(file.length()<2||file.length()>MAX)throw new IOException();byte[] bytes=readFile(file);if((bytes[0]&255)!=255||(bytes[1]&255)!=216)throw new IOException();
        call.resolve(new JSObject().put("data",Base64.encodeToString(bytes,Base64.NO_WRAP)).put("name","Photo-MIR.jpg").put("mime","image/jpeg").put("cancelled",false));
    }catch(Exception e){call.reject("Photo refusée. Aucun téléversement effectué.");}finally{file.delete();}}
    private void launchScanner(PluginCall call){IntentIntegrator scanner=new IntentIntegrator(getActivity());scanner.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE);scanner.setPrompt("Scanner le code MIR");scanner.setBeepEnabled(false);scanner.setOrientationLocked(false);startActivityForResult(call,scanner.createScanIntent(),"scanResult");}
    @ActivityCallback private void scanResult(PluginCall call,ActivityResult activity){if(call==null)return;IntentResult result=IntentIntegrator.parseActivityResult(activity.getResultCode(),activity.getData());JSObject value=new JSObject();value.put("cancelled",result.getContents()==null);if(result.getContents()!=null)value.put("value",result.getContents());call.resolve(value);}
    @PluginMethod public void pickFile(PluginCall call){if(!trusted(call))return;Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("*/*");intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/pdf","image/jpeg","image/png","image/webp"});startActivityForResult(call,intent,"fileResult");}
    @ActivityCallback private void fileResult(PluginCall call,ActivityResult activity){if(call==null)return;if(activity.getResultCode()!=Activity.RESULT_OK||activity.getData()==null){call.resolve(new JSObject().put("cancelled",true));return;}try{
        Uri uri=activity.getData().getData();String mime=getContext().getContentResolver().getType(uri);
        if(!java.util.Arrays.asList("application/pdf","image/jpeg","image/png","image/webp").contains(mime))throw new IOException();
        ByteArrayOutputStream out=new ByteArrayOutputStream();try(InputStream in=getContext().getContentResolver().openInputStream(uri)){byte[] buffer=new byte[8192];int size;while((size=in.read(buffer))!=-1){if(out.size()+size>MAX)throw new IOException();out.write(buffer,0,size);}}
        String name="Pièce-jointe"+(mime.equals("application/pdf")?".pdf":mime.equals("image/png")?".png":mime.equals("image/webp")?".webp":".jpg");
        call.resolve(new JSObject().put("name",name).put("mime",mime).put("data",Base64.encodeToString(out.toByteArray(),Base64.NO_WRAP)).put("cancelled",false));
    }catch(Exception e){call.reject("Fichier refusé : PDF, JPEG, PNG ou WebP, maximum 20 Mo. Aucun téléversement effectué.");}}
}
