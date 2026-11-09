/* Supplier records and private PDF revisions use the existing MIR order/outbox tables. */
(() => {
  "use strict";
  const esc = (v) =>
      String(v ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      ),
    cfg = window.MIRPortalConfig || window.MIRSharedConfig,
    ref = new URL(cfg.supabaseUrl).hostname.split(".")[0],
    test = ref === "hxtztkmbfpmzrieccwsg",
    db = MIRSupabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
      auth: {
        storageKey: "mir_portal_auth_" + ref,
        flowType: "pkce",
        autoRefreshToken: false,
      },
    });
  let active = null,
    busy = false,
    doc = null,
    previewed = null,
    previewURL = null,
    logoPromise = null;
  async function rpc(name, args) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    return data;
  }
  function status(p) {
    const sent = (p.sendJobs || []).some(
        (s) =>
          s.revision === p.revision &&
          ["accepted", "delivered"].includes(s.status),
      ),
      document =
        p.status === "draft" ? "Brouillon" : sent ? "Envoyé" : "Approuvé",
      received =
        p.expectedQty > 0 && p.receivedQty === p.expectedQty
          ? "Reçu"
          : p.receivedQty > 0
            ? "Reçu partiellement"
            : "";
    return document + (received ? " · " + received : "");
  }
  async function render(container, ids, { pendingOnly = false } = {}) {
    const unique = [...new Set(ids)];
    container.innerHTML = unique.length
      ? "<p>Lecture des bons serveur…</p>"
      : "<p>Aucun bon fournisseur.</p>";
    const all = await Promise.all(
        unique.map((id) => rpc("mir_supplier_po_detail", { p_po: id })),
      ),
      records = pendingOnly
        ? all.filter(
            (p) =>
              !p.sendJobs.some(
                (s) =>
                  s.revision === p.revision &&
                  ["accepted", "delivered"].includes(s.status),
              ),
          )
        : all;
    container.innerHTML = records
      .map(
        (p) =>
          `<div class="co-event admin-card"><strong>${esc(p.snapshot.poNumber || p.id)} · R${p.revision}</strong><p>${esc(p.supplier.name)} · ${esc(p.snapshot.job)}<br>${esc(p.snapshot.address)}</p><p>${status(p)}</p><button type="button" class="button secondary" data-purchase-open="${p.id}">Consulter le bon et son PDF</button></div>`,
      )
      .join("");
  }
  function modal() {
    let d = document.querySelector("#mir-purchase-dialog");
    if (!d) {
      d = document.createElement("dialog");
      d.id = "mir-purchase-dialog";
      d.style.cssText =
        "max-width:min(92vw,850px);max-height:90vh;overflow:auto;padding:24px;border:1px solid #aaa;border-radius:12px";
      document.body.append(d);
    }
    return d;
  }
  async function open(id) {
    previewed = null;
    if (previewURL) {
      URL.revokeObjectURL(previewURL);
      previewURL = null;
    }
    active = await rpc("mir_supplier_po_detail", { p_po: id });
    doc = active.documents.find((d) => d.revision === active.revision) || null;
    const p = active,
      d = modal();
    d.innerHTML = `<form method="dialog"><button class="button secondary">Fermer</button></form><h2>${esc(p.snapshot.poNumber)} · R${p.revision}</h2><p>${status(p)} · ${esc(p.supplier.name)}</p><p>Job ${esc(p.snapshot.job)}<br>Livrer à : ${esc(p.snapshot.address)}</p><ul>${p.lines.map((l) => `<li>${l.quantity} ${esc(l.unit)} · ${esc(l.specification.name || l.specification.itemName)} · ${esc(l.specification.manufacturerReference || "Référence à confirmer")} · ${esc(l.specification.colorName || "")}</li>`).join("")}</ul><p id="purchase-status" role="status"></p><div class="admin-actions">${!doc ? '<button class="button secondary" data-purchase-preview>Prévisualiser le PDF</button>' : ""}${doc ? '<button class="button secondary" data-purchase-download>Télécharger le PDF approuvé</button>' : '<button class="button" data-purchase-approve disabled>Préparer le PDF et approuver cette révision</button>'}${p.status === "approved" ? '<button class="button secondary" data-purchase-revise>Corriger la présentation dans une nouvelle révision</button>' : ""}${p.status === "approved" ? `<button class="button" data-purchase-send>${test ? "Envoyer le bon de recette" : "Envoyer le bon"}</button>` : ""}</div><div id="purchase-pdf-preview"></div><h3>Révisions et documents conservés</h3>${p.documents.map((d) => `<p>Révision ${d.revision} · PDF ${esc(d.sha256.slice(0, 12))}<button class="button secondary" data-purchase-document="${d.id}">Télécharger</button></p>`).join("")}<p>${test ? "MIR TEST · le destinataire de recette est imposé par le serveur." : "Le destinataire est le contact fournisseur vérifié. Le statut Envoyé exige une confirmation du service."}</p>`;
    if (!d.open) d.showModal();
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function pdf(p) {
    if (!logoPromise)
      logoPromise = fetch("assets/MIR-logo-officiel-original.svg")
        .then((r) => {
          if (!r.ok) throw Error("Logo MIR indisponible.");
          return r.text();
        })
        .then(
          (svg) =>
            "data:image/svg+xml;base64," +
            btoa(unescape(encodeURIComponent(svg))),
        );
    const options = MIRSupplierPDF.buildOptions(p, {
      test,
      logo: await logoPromise,
    });
    const result = await MIRPDF.makePlan(options);
    return { ...result, options };
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button");
    if (
      !b ||
      !b.matches(
        "[data-purchase-open],[data-purchase-approve],[data-purchase-send],[data-purchase-download],[data-purchase-document],[data-purchase-preview],[data-purchase-revise]",
      ) ||
      busy
    )
      return;
    busy = true;
    b.disabled = true;
    try {
      if (b.dataset.purchaseOpen) {
        await open(b.dataset.purchaseOpen);
        return;
      }
      const s = document.querySelector("#purchase-status");
      s.textContent = "Vérification serveur…";
      if (b.hasAttribute("data-purchase-revise")) {
        const key =
          "mir_supplier_revision_" +
          ref +
          "_" +
          active.id +
          "_r" +
          active.revision;
        let id = localStorage.getItem(key);
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem(key, id);
        }
        await rpc("mir_supplier_document_revision", {
          p_po: active.id,
          p_revision: active.revision,
          p_request_id: id,
        });
        await open(active.id);
        document.querySelector("#purchase-status").textContent =
          "Nouvelle révision documentaire. Les quantités, réceptions et mouvements de stock restent conservés.";
      }
      if (b.hasAttribute("data-purchase-preview")) {
        const latest = await rpc("mir_supplier_po_detail", { p_po: active.id });
        if (latest.revision !== active.revision || latest.status !== "draft")
          throw Error("Actualisez le bon avant de préparer son PDF.");
        previewed = await pdf(latest);
        const box = document.querySelector("#purchase-pdf-preview");
        box.replaceChildren();
        for (const face of previewed.options.faces) {
          const img = document.createElement("img"),
            url = URL.createObjectURL(
              new Blob([face.svg], { type: "image/svg+xml" }),
            );
          img.src = url;
          img.alt = "Aperçu du bon fournisseur · " + face.name;
          img.style.cssText =
            "width:100%;height:auto;border:1px solid #ddd;margin-top:16px";
          img.onload = () => URL.revokeObjectURL(url);
          box.append(img);
        }
        previewURL = URL.createObjectURL(previewed.blob);
        const link = document.createElement("a");
        link.href = previewURL;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = "Ouvrir le PDF pour vérifier son rendu";
        link.className = "button secondary";
        box.prepend(link);
        document.querySelector("[data-purchase-approve]").disabled = false;
        s.textContent =
          "Vérifiez le PDF avant d’approuver. " + previewed.pages + " page(s).";
      }
      if (b.hasAttribute("data-purchase-approve")) {
        const latest = await rpc("mir_supplier_po_detail", { p_po: active.id });
        if (latest.revision !== active.revision || latest.status !== "draft")
          throw Error("Le bon a été modifié. Fermez puis rechargez-le.");
        if (!previewed)
          throw Error("Prévisualisez et vérifiez le PDF avant de l’approuver.");
        const result = previewed,
          bytes = new Uint8Array(await result.blob.arrayBuffer()),
          sha = [
            ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
          ]
            .map((x) => x.toString(16).padStart(2, "0"))
            .join(""),
          path =
            latest.organization_id +
            "/" +
            latest.id +
            "/" +
            latest.revision +
            "/" +
            crypto.randomUUID() +
            ".pdf";
        const { error } = await db.storage
          .from("mir-supplier-documents")
          .upload(path, bytes, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (error) throw error;
        await rpc("mir_supplier_approve", {
          p_po: latest.id,
          p_revision: latest.revision,
          p_path: path,
          p_sha256: sha,
        });
        await open(active.id);
        document.querySelector("#purchase-status").textContent =
          "PDF privé archivé · révision approuvée. Aucun envoi effectué.";
      }
      if (
        b.hasAttribute("data-purchase-download") ||
        b.dataset.purchaseDocument
      ) {
        const d = b.dataset.purchaseDocument
          ? active.documents.find((d) => d.id === b.dataset.purchaseDocument)
          : doc;
        const { data: blob, error } = await db.storage
          .from("mir-supplier-documents")
          .download(d.object_path);
        if (error) throw error;
        download(blob, active.snapshot.poNumber + "-R" + d.revision + ".pdf");
        s.textContent = "PDF original téléchargé.";
      }
      if (b.hasAttribute("data-purchase-send")) {
        const {
            data: { session },
          } = await db.auth.getSession(),
          key =
            "mir_supplier_send_" +
            ref +
            "_" +
            active.id +
            "_r" +
            active.revision;
        let id = localStorage.getItem(key);
        if (!id) {
          id = crypto.randomUUID();
          localStorage.setItem(key, id);
        }
        const response = await fetch(
          cfg.supabaseUrl + "/functions/v1/mir-admin-delivery",
          {
            method: "POST",
            headers: {
              authorization: "Bearer " + session.access_token,
              "content-type": "application/json",
              apikey: cfg.publishableKey,
            },
            body: JSON.stringify({
              orderId: active.id,
              revision: active.revision,
              documentId: doc.id,
              requestId: id,
            }),
          },
        );
        const r = await response.json();
        if (!response.ok || !r.ok)
          throw Error(r.message || "Envoi à vérifier.");
        await open(active.id);
        document.querySelector("#purchase-status").textContent =
          "Envoyé · accepté par le service. " +
          (r.subject || "Même envoi retrouvé sans doublon.");
      }
    } catch (e) {
      const s = document.querySelector("#purchase-status");
      if (s) s.textContent = e.message;
      else console.error("Bon fournisseur indisponible");
    } finally {
      busy = false;
      if (b.isConnected)
        b.disabled = b.hasAttribute("data-purchase-approve") && !previewed;
    }
  });
  window.MIRAdminPurchases = Object.freeze({ render, open });
})();
