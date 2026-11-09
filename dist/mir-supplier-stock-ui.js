(() => {
  "use strict";
  const cfg = MIRSharedConfig,
    ref = new URL(cfg.supabaseUrl).hostname.split(".")[0],
    db = MIRSupabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
      auth: { storageKey: "mir_portal_auth_" + ref, autoRefreshToken: false },
    }),
    section = document.createElement("section");
  section.className = "wh-card";
  document.querySelector("#wh-workspace").append(section);
  let busy = false;
  async function rpc(name, args = {}) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    return data;
  }
  async function load() {
    if (document.querySelector("#wh-workspace").hidden || busy) return;
    try {
      const rows = await rpc("mir_supplier_stock_queue");
      section.replaceChildren();
      const h = document.createElement("h2");
      h.textContent = "Réceptions fournisseurs en stock · chantiers à livrer";
      section.append(h);
      if (!rows.length) {
        const p = document.createElement("p");
        p.textContent =
          "Aucun matériel reçu en stock en attente de livraison chantier.";
        section.append(p);
      }
      for (const r of rows) {
        const f = document.createElement("form"),
          p = document.createElement("p");
        p.textContent =
          r.name +
          " · " +
          r.remaining +
          " " +
          r.unit +
          " à livrer au job " +
          r.job +
          " · " +
          r.address;
        const label = document.createElement("label");
        label.textContent = "Quantité à livrer";
        const n = document.createElement("input");
        n.type = "number";
        n.min = "1";
        n.max = r.remaining;
        n.step = "1";
        n.required = true;
        label.append(n);
        const b = document.createElement("button");
        b.textContent = "Confirmer la livraison depuis le stock";
        f.append(p, label, b);
        f.onsubmit = async (e) => {
          e.preventDefault();
          if (busy) return;
          busy = true;
          b.disabled = true;
          const {
              data: { user },
            } = await db.auth.getUser(),
            key = "mir_stock_dispatch_" + ref + "_" + user.id + "_" + r.id,
            signature = String(n.value);
          let op = JSON.parse(localStorage.getItem(key) || "null");
          try {
            if (op && op.quantity !== signature)
              throw Error("Confirmez d’abord la livraison précédente.");
            if (!op) {
              op = { id: crypto.randomUUID(), quantity: signature };
              localStorage.setItem(key, JSON.stringify(op));
            }
            await rpc("mir_supplier_stock_dispatch", {
              org: document.querySelector("#wh-org").value,
              route_id: r.id,
              quantity: Number(n.value),
              request_id: op.id,
            });
            localStorage.removeItem(key);
            document.querySelector("#wh-status").textContent =
              "Livraison enregistrée, stock déduit une seule fois.";
          } catch (e) {
            document.querySelector("#wh-status").textContent = e.message;
            if (["22023", "42501"].includes(e.code))
              localStorage.removeItem(key);
          } finally {
            busy = false;
            b.disabled = false;
            await load();
          }
        };
        section.append(f);
      }
    } catch (e) {
      section.textContent = "Réceptions en stock : " + e.message;
    }
  }
  document.querySelector("#wh-refresh").addEventListener("click", load);
  document.querySelector("#wh-queue-refresh").addEventListener("click", load);
  const timer = setInterval(load, 18000);
  addEventListener("pagehide", () => clearInterval(timer));
  void load();
})();
