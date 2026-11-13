package ca.revetementsmir.equipe.test;

import java.net.URI;
import java.util.Set;

/** Native boundary, independent of DOM, role labels and JavaScript fetch wrappers. */
public final class MirPolicy {
    public static final String TEST_HOST = "hxtztkmbfpmzrieccwsg.supabase.co";
    private static final Set<String> ROUTES = new java.util.HashSet<>(java.util.Arrays.asList("/", "/index.html", "/native-checks.html", "/native-pdf.html", "/chantier.html", "/entrepot.html", "/coordination.html", "/production.html", "/calepinage.html", "/espace-partage.html"));
    private MirPolicy() {}
    public static boolean local(String value) {
        try { URI u = URI.create(value); return "https".equals(u.getScheme()) && "localhost".equals(u.getHost()) && u.getUserInfo() == null && (u.getPort() == -1 || u.getPort() == 443); }
        catch (Exception e) { return false; }
    }
    public static boolean navigation(String value) {
        try { URI u = URI.create(value); return local(value) && ROUTES.contains(u.getPath()); }
        catch (Exception e) { return false; }
    }
    public static boolean request(String value) {
        try {
            URI u = URI.create(value);
            if (local(value)) return !u.getPath().contains("..") && !u.getPath().contains("\\");
            if (!"https".equals(u.getScheme()) || !TEST_HOST.equals(u.getHost()) || u.getUserInfo() != null || (u.getPort() != -1 && u.getPort() != 443)) return false;
            String path = u.normalize().getPath();
            if (path.startsWith("/functions/") || path.contains("..") || path.contains("\\")) return false;
            if (path.startsWith("/auth/")) return java.util.Arrays.asList("/auth/v1/token", "/auth/v1/user", "/auth/v1/logout").contains(path);
            return path.startsWith("/rest/v1/") || path.startsWith("/storage/v1/") || path.startsWith("/realtime/v1/");
        } catch (Exception e) { return false; }
    }
    public static boolean external(String value) {
        try { URI u=URI.create(value); return "https".equals(u.getScheme()) && u.getHost()!=null && u.getUserInfo()==null && !u.getHost().endsWith("supabase.co") && !local(value); }
        catch(Exception e){return false;}
    }
}
