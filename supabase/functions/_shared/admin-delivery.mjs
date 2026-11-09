import { Buffer } from "node:buffer";
const sha256 = async (bytes) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
export function createAdminDelivery({ env, fetchImpl = fetch } = {}) {
  const get = (k) => (typeof env?.get === "function" ? env.get(k) : env?.[k]),
    base = get("SUPABASE_URL"),
    service =
      JSON.parse(get("SUPABASE_SECRET_KEYS") || "{}").default ||
      get("SUPABASE_SERVICE_ROLE_KEY"),
    anon =
      JSON.parse(get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default ||
      get("SUPABASE_ANON_KEY"),
    test = base === "https://hxtztkmbfpmzrieccwsg.supabase.co";
  const headers = {
    "access-control-allow-origin": "https://revetementsmirweb.github.io",
    "access-control-allow-headers":
      "authorization,apikey,content-type,x-client-info",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "cache-control": "no-store",
    "content-type": "application/json",
  };
  const fail = (message, status = 400) =>
      Object.assign(Error(message), { status }),
    reply = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers });
  async function rest(name, args, token) {
    const r = await fetchImpl(base + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        apikey: token === service ? service : anon,
        authorization: "Bearer " + token,
        "content-type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(25000),
    });
    const d = await r.json();
    if (!r.ok) throw fail(d.message || "Service indisponible.", r.status);
    return d;
  }
  const dispatch = (action, body) =>
    rest("mir_supplier_dispatch_rpc", { action, body }, service);
  return async (req) => {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    let claimed;
    try {
      if (
        req.headers.get("origin") &&
        req.headers.get("origin") !== "https://revetementsmirweb.github.io"
      )
        throw fail("Origine non autorisée.", 403);
      const token = /^Bearer (\S+)$/.exec(
        req.headers.get("authorization") || "",
      )?.[1];
      if (!token) throw fail("Connexion MIR requise.", 401);
      const u = await fetchImpl(base + "/auth/v1/user", {
        headers: {
          apikey: token === service ? service : anon,
          authorization: "Bearer " + token,
        },
        signal: AbortSignal.timeout(15000),
      });
      if (!u.ok) throw fail("Session à vérifier.", 401);
      const snapshot = await rest("mir_portal_snapshot", {}, token);
      if (!snapshot.permissions.coordination)
        throw fail("Accès Coordination requis.", 403);
      const configured = !!(
        get("RESEND_API_KEY") &&
        get("MIR_ESTIMATE_FROM") &&
        (test
          ? get("MIR_ESTIMATE_MODE") === "test" && get("MIR_ESTIMATE_TO")
          : get("MIR_SUPPLIER_SEND_ENABLED") === "true")
      );
      if (req.method === "GET")
        return reply({
          enabled: configured,
          environment: test ? "test" : "production",
          recipientPolicy: test
            ? "Boîte de recette MIR imposée par le serveur"
            : "Contact fournisseur vérifié",
          missing: configured
            ? []
            : [
                "RESEND_API_KEY / MIR_ESTIMATE_FROM / " +
                  (test
                    ? "MIR_ESTIMATE_MODE=test et MIR_ESTIMATE_TO"
                    : "MIR_SUPPLIER_SEND_ENABLED=true"),
              ],
        });
      if (req.method !== "POST") throw fail("Méthode non autorisée.", 405);
      if (!configured)
        throw fail(
          "Envoi fournisseur désactivé. Le bon approuvé et son PDF sont conservés.",
          503,
        );
      if (Number(req.headers.get("content-length")) > 4096)
        throw fail("Requête trop volumineuse.", 413);
      const raw = await req.text();
      if (raw.length > 4096) throw fail("Requête trop volumineuse.", 413);
      const body = JSON.parse(raw);
      for (const k of ["orderId", "documentId", "requestId"])
        if (!/^[0-9a-f-]{36}$/i.test(body[k] || ""))
          throw fail("Identifiant invalide.");
      const po = await rest(
        "mir_supplier_po_detail",
        { p_po: body.orderId },
        token,
      );
      if (po.status !== "approved" || po.revision !== body.revision)
        throw fail("Approuvez la révision courante avant l’envoi.", 409);
      const id = await rest(
        "mir_supplier_queue",
        {
          p_po: body.orderId,
          p_revision: body.revision,
          p_document: body.documentId,
          p_request_id: body.requestId,
        },
        token,
      );
      const c = await dispatch("claim", { id }),
        j = c.job;
      if (["accepted", "delivered"].includes(j.status))
        return reply({
          ok: true,
          status: "accepted",
          number: po.snapshot.poNumber,
          sendJobId: id,
          messageId: j.provider_message_id,
          replayed: true,
        });
      claimed = { id, attempt: j.attempts };
      const document = c.document,
        r = await fetchImpl(
          base +
            "/storage/v1/object/authenticated/mir-supplier-documents/" +
            document.object_path,
          {
            headers: { apikey: service, authorization: "Bearer " + service },
            signal: AbortSignal.timeout(25000),
          },
        );
      if (!r.ok) throw fail("Le PDF privé ne peut pas être vérifié.", 503);
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (
        bytes.length > 20971520 ||
        new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-" ||
        (await sha256(bytes)) !== document.sha256
      )
        throw fail("Le PDF archivé ne correspond pas à cette révision.", 422);
      const subject =
        (test ? "[RECETTE MIR TEST] " : "") +
        "Bon fournisseur MIR — " +
        po.snapshot.poNumber +
        " — R" +
        po.revision +
        (po.snapshot.documentCorrection ? " (PDF corrigé)" : "");
      const accepted = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: "Bearer " + get("RESEND_API_KEY"),
          "content-type": "application/json",
          "idempotency-key": "mir-supplier-" + id,
        },
        body: JSON.stringify({
          from: get("MIR_ESTIMATE_FROM"),
          to: [test ? get("MIR_ESTIMATE_TO") : j.recipient],
          subject,
          text: [
            "Bon fournisseur MIR",
            po.snapshot.poNumber,
            "Révision : " + po.revision,
            "Chantier : " + (po.snapshot.job || "À confirmer"),
            "Livraison : " + (po.snapshot.address || "À confirmer"),
            po.snapshot.documentCorrection
              ? "CORRECTION DE PRÉSENTATION UNIQUEMENT — AUCUNE QUANTITÉ SUPPLÉMENTAIRE. Le PDF corrigé remplace la présentation précédente."
              : "Le PDF approuvé de cette révision est joint.",
            test ? "RECETTE FICTIVE — NE PAS TRAITER." : "",
          ].join("\n"),
          attachments: [
            {
              filename: po.snapshot.poNumber + "-R" + po.revision + ".pdf",
              content: Buffer.from(bytes).toString("base64"),
              content_type: "application/pdf",
            },
          ],
        }),
        signal: AbortSignal.timeout(20000),
      });
      const message = await accepted.json();
      if (!accepted.ok || !message.id) {
        await dispatch("complete", {
          ...claimed,
          status: accepted.status >= 500 ? "uncertain" : "failed",
          error: "Resend HTTP " + accepted.status,
        });
        claimed = null;
        throw fail(
          "Le service d’envoi n’a pas confirmé le bon. Réessayez le même envoi.",
          503,
        );
      }
      await dispatch("complete", {
        ...claimed,
        status: "accepted",
        messageId: message.id,
      });
      claimed = null;
      return reply({
        ok: true,
        status: "accepted",
        number: po.snapshot.poNumber,
        sendJobId: id,
        messageId: message.id,
        subject,
      });
    } catch (e) {
      if (claimed)
        try {
          await dispatch("complete", {
            ...claimed,
            status: "uncertain",
            error: "Réponse interrompue; reprendre avec la même clé.",
          });
        } catch {}
      const message = String(e.message || "").includes("BUSY")
        ? "Un envoi est déjà en cours. Réessayez la même action."
        : String(e.message || "").includes("RECONCILIATION_REQUIRED")
          ? "MIR doit vérifier cet envoi avant une nouvelle tentative."
          : e.status
            ? e.message
            : "Le service ne peut pas confirmer l’envoi. Votre bon est conservé.";
      return reply({ ok: false, message }, e.status || 503);
    }
  };
}
