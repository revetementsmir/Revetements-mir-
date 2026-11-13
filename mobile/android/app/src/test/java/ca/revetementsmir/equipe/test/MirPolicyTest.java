package ca.revetementsmir.equipe.test;
import org.junit.Test;
import static org.junit.Assert.*;
public class MirPolicyTest {
 @Test public void nativeBoundaryIsFailClosed(){
  assertTrue(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co/rest/v1/rpc/mir_account_snapshot"));
  assertFalse(MirPolicy.request("https://gccltmaulvrnthrbnrpd.supabase.co/rest/v1/"));
  assertFalse(MirPolicy.request("http://hxtztkmbfpmzrieccwsg.supabase.co/rest/v1/"));
  assertFalse(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co.evil.example/rest/v1/"));
  assertFalse(MirPolicy.request("https://user@hxtztkmbfpmzrieccwsg.supabase.co/rest/v1/"));
  assertFalse(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co/functions/v1/send"));
  assertFalse(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1/recover"));
  assertTrue(MirPolicy.navigation("https://localhost/chantier.html"));
  for(String page:new String[]{"plan.html","boutique.html","produit.html","selection.html","pliage.html","estimation.html"})assertFalse(MirPolicy.navigation("https://localhost/"+page));
  assertFalse(MirPolicy.navigation("https://localhost/untrusted/chantier.html"));
  assertFalse(MirPolicy.navigation("https://evil.example/chantier.html"));
  assertFalse(MirPolicy.navigation("javascript:alert(1)"));
  assertFalse(MirPolicy.external("https://hxtztkmbfpmzrieccwsg.supabase.co/storage/v1/object/sign/private"));
  assertTrue(MirPolicy.external("https://www.google.com/maps/dir/?destination=Quebec"));
 }
}
