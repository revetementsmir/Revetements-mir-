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
  assertTrue(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1/recover"));
  assertFalse(MirPolicy.request("https://gccltmaulvrnthrbnrpd.supabase.co/auth/v1/recover"));
  assertFalse(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co/auth/v1/otp"));
  assertTrue(MirPolicy.navigation("https://localhost/chantier.html"));
  for(String name:new String[]{"mir_client_center_snapshot_scoped","mir_client_support_action_scoped","mir_estimate_submit"})assertFalse(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co/rest/v1/rpc/"+name));
  assertTrue(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co/rest/v1/rpc/mir_management_action"));
  assertFalse(MirPolicy.request("https://hxtztkmbfpmzrieccwsg.supabase.co/rest/v1/rpc/mir_%63lient_support_action_scoped"));
  for(String url:new String[]{"https://www.revetementsmir.com/estimation.html","https://revetementsmir.com/","https://revetementsmir.github.io/Revetements-mir-/"})assertFalse(MirPolicy.external(url));
  assertTrue(MirPolicy.navigation("https://localhost/production.html?mode=client&source=store&kind=profile"));
  for(String query:new String[]{"mode=client","mode=client&kind=panel","mode=client&source=store","mode=client&source=store&kind=panel","mode=client&source=store&kind=profile&mode=admin","mode=client&source=store&source=client&kind=profile","mode=client&source=store&kind=profile&kind=panel","%6dode=client","estimate=1","estimate=0"})assertFalse(query,MirPolicy.navigation("https://localhost/production.html?"+query));
  assertFalse(MirPolicy.navigation("https://localhost/chantier.html?estimate=1"));
  for(String page:new String[]{"plan.html","boutique.html","produit.html","selection.html","pliage.html","estimation.html"})assertFalse(MirPolicy.navigation("https://localhost/"+page));
  assertFalse(MirPolicy.navigation("https://localhost/untrusted/chantier.html"));
  assertFalse(MirPolicy.navigation("https://evil.example/chantier.html"));
  assertFalse(MirPolicy.navigation("javascript:alert(1)"));
  assertFalse(MirPolicy.external("https://hxtztkmbfpmzrieccwsg.supabase.co/storage/v1/object/sign/private"));
  assertTrue(MirPolicy.external("https://www.google.com/maps/dir/?destination=Quebec"));
 }
}
