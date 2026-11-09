/* The hub uses the existing account identity, RPCs and internal modules. */
(async function () {
  "use strict";
  const $ = (s) => document.querySelector(s),
    esc = (v) =>
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
    cfg = MIRPortalConfig,
    test = cfg.environment === "test",
    query = test ? "recette=1&" : "",
    href = (page, args = "") => page + "?" + query + args;
  const db = MIRSupabase.createClient(cfg.supabaseUrl, cfg.publishableKey, {
    auth: {
      storageKey: "mir_portal_auth_" + cfg.projectRef,
      flowType: "pkce",
      detectSessionInUrl: false,
    },
  });
  let data,
    identity,
    job,
    busy = false,
    items = [],
    estimateRows = [],
    estimateOwners = [];
  const status = (v) => ($("#admin-status").textContent = v),
    content = (v) => ($("#admin-content").innerHTML = v),
    card = (title, body) =>
      `<section class="admin-card"><h2>${esc(title)}</h2>${body}</section>`,
    button = (label, attrs = "") =>
      `<button class="button secondary" ${attrs}>${esc(label)}</button>`,
    field = (label, name, value = "", type = "text", extra = "") =>
      `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  async function rpc(name, args = {}) {
    const { data, error } = await db.rpc(name, args);
    if (error) throw error;
    return data;
  }
  function dialog(html) {
    $("#admin-dialog-body").innerHTML = html;
    $("#admin-dialog").showModal();
  }
  async function action(command, payload) {
    const key = "mir_admin_pending_" + cfg.projectRef + "_" + identity.id;
    let pending = JSON.parse(localStorage.getItem(key) || "null");
    if (
      pending &&
      (pending.command !== command ||
        JSON.stringify(pending.payload) !== JSON.stringify(payload))
    )
      throw Error(
        "Une action attend confirmation. Reprenez-la avant une autre modification.",
      );
    if (!pending) {
      pending = { command, payload, id: crypto.randomUUID() };
      localStorage.setItem(key, JSON.stringify(pending));
    }
    try {
      const r = await rpc("mir_portal_command", {
        p_command: command,
        p_payload: payload,
        p_request_id: pending.id,
      });
      localStorage.removeItem(key);
      await refresh();
      return r.result;
    } catch (e) {
      if (e.code && /^(22|23|40|42|0A)/.test(e.code)) localStorage.removeItem(key);
      throw e;
    }
  }
  function jobLink(j) {
    return `<a class="button secondary" href="${href("administration.html", "job=" + j.id)}">${esc(j.number ? j.number + " · " + j.name : j.name)}</a>`;
  }
  async function refresh() {
    data = await rpc("mir_administration", { p_search: "" });
  }
  function navigation() {
    const p = data.snapshot.permissions;
    $("#admin-nav").innerHTML = [
      ["today", "Aujourd’hui", true],
      ["staff", "Équipe", p.admin],
      ["jobs", "Chantiers", p.jobs],
      ["orders", "Commandes", p.coordination],
      ["warehouse", "Entrepôt", p.warehouse],
      ["purchases", "Achats", p.coordination],
      ["estimates", "Estimations", p.estimates],
      ["catalogue", "Magasin employé", p.admin],
    ]
      .filter((x) => x[2])
      .map(
        ([id, label]) =>
          `<a class="button secondary" href="${href("administration.html", "section=" + id)}">${label}</a>`,
      )
      .join("");
    $("#admin-account").href = href("chantier.html");
    $("#admin-search").hidden = false;
  }
  async function renderToday() {
    const t = data.today,
      p = data.snapshot.permissions;
    content(
      '<div class="admin-grid">' +
        (p.coordination
          ? card(
              "Demandes à trier",
              `<strong>${t.toSort}</strong><p>Commandes en attente de répartition.</p><a class="button" href="${href("coordination.html", "filter=new")}">Trier les demandes</a>`,
            )
          : "") +
        (p.warehouse
          ? card(
              "Préparations en cours",
              `<strong>${t.preparations}</strong><p>Vérifiez les changements et les quantités affectées à l’entrepôt.</p><a class="button" href="${href("entrepot.html", "filter=pending")}">Ouvrir les préparations</a>`,
            )
          : "") +
        (p.coordination
          ? card(
              "Bons à approuver ou envoyer",
              `<strong>${t.toSend}</strong><p>Les brouillons ne sont pas des bons envoyés.</p><a class="button" href="${href("administration.html", "section=purchases&filter=to-send")}">Vérifier les bons</a>`,
            )
          : "") +
        (p.coordination
          ? card(
              "Réceptions en retard",
              `<strong>${t.overdue}</strong><p>Relances selon les dates serveur.</p><a class="button" href="${href("administration.html", "section=late")}">Voir les retards</a>`,
            )
          : "") +
        "</div>",
    );
    await blockers(null);
  }
  async function blockers(jobId, lateOnly = false) {
    const all = await rpc("mir_job_blockers", { p_job_id: jobId }),
      rows = lateOnly ? all.filter((r) => r.overdue) : all;
    $("#admin-content").insertAdjacentHTML(
      "beforeend",
      card(
        "Blocages et matériel attendu",
        rows
          .map(
            (r) =>
              `<p>${esc(r.message)}<br><a class="button secondary" href="${href(data?.snapshot?.permissions.coordination ? "coordination.html" : "administration.html", data?.snapshot?.permissions.coordination ? "order=" + r.orderId : "job=" + r.jobId)}">${r.overdue ? "Réception en retard · " : ""}Ouvrir le suivi</a></p>`,
          )
          .join("") || "<p>Aucun reliquat fournisseur signalé.</p>",
      ),
    );
  }
  function renderJobs() {
    content(
      button("Créer un chantier", "data-new-job") +
        data.snapshot.jobs
          .map((j) =>
            card(
              j.number ? "Job " + j.number : j.name,
              `<p>${esc(j.name)} · ${esc(j.address || "Adresse à confirmer")}</p><p>${esc(j.team || "Équipe à confirmer")} · ${esc(j.requiredDate || "Date à confirmer")}</p>${jobLink(j)}`,
            ),
          )
          .join(""),
    );
  }
  function jobForm(j = {}) {
    return `<form id="admin-job-form" data-id="${esc(j.id || "")}" data-revision="${j.revision || 0}">${field("Numéro de job", "number", j.number, "text", 'maxlength="40" required')}${field("Nom du chantier", "name", j.name, "text", 'maxlength="160" required')}${field("Adresse de livraison", "address", j.address, "text", 'maxlength="300" required')}${field("Chef de chantier", "foreman", j.foreman)}${field("Équipe", "team", j.team)}${field("Date requise", "requiredDate", j.requiredDate, "date")}${j.id ? `<label class="admin-check"><input type="checkbox" name="archived" ${j.archived ? "checked" : ""}>Archivé</label>` : ""}<button class="button">${j.id ? "Enregistrer" : "Créer le chantier"}</button></form>`;
  }
  async function renderJob(id) {
    job = await rpc("mir_job_detail", { p_job_id: id });
    $("#admin-title").textContent =
      "Job " + (job.job_number || "") + " · " + job.name;
    const latest = new Map();
    for (const d of job.documents)
      if (
        !latest.has(d.family_id) ||
        latest.get(d.family_id).version < d.version
      )
        latest.set(d.family_id, d);
    content(
      card(
        "Chantier",
        `<p>${esc(job.delivery_address || "Adresse à confirmer")}</p><p>${esc(job.team || "Équipe à confirmer")} · ${esc(job.foreman || "Chef à confirmer")}</p><p>${esc(job.required_date || "Date à confirmer")} · ${job.archived ? "Archivé" : "Actif"}</p>${job.canManage ? button("Modifier le chantier", "data-edit-job") : ""}<a class="button secondary" href="${href("chantier.html")}">Magasin employé</a>`,
      ) +
        card(
          "Plans, PDF et photos",
          `${job.canManage ? `<form id="admin-document-form"><label>Document à ajouter<input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required></label><label>Nouvelle pièce ou révision<select name="family"><option value="">Nouveau document</option>${[...latest.values()].map((d) => `<option value="${d.family_id}">${esc(d.name)} · révision ${d.version}</option>`).join("")}</select></label><p>PDF, JPG, PNG ou WebP · 20 Mio maximum. Les anciennes versions sont conservées.</p><button class="button">Publier la version</button></form>` : ""}${job.documents.map((d) => `<p><strong>${esc(d.name)}</strong> · v${d.version} ${latest.get(d.family_id).id === d.id ? "· Courante" : "· Ancienne version"}<br>${esc(d.created_at)} · ${esc(d.author)}<br>${button("Télécharger", 'data-download="' + d.id + '"')}</p>`).join("") || "<p>Aucun document publié.</p>"}`,
        ) +
        card(
          "Commandes",
          job.orders
            .map(
              (o) =>
                `<p>${esc(o.number || o.id)} · ${esc(o.createdAt)}<br><a class="button secondary" href="${href(data?.snapshot?.permissions.coordination ? "coordination.html" : "chantier.html", data?.snapshot?.permissions.coordination ? "order=" + o.id : "section=orders&filter=all")}">${data?.snapshot?.permissions.coordination ? "Coordonner" : "Suivi du matériel"}</a></p>`,
            )
            .join("") || "<p>Aucune commande.</p>",
        ),
    );
    if (job.purchases?.length) {
      const box = document.createElement("section");
      box.className = "admin-card";
      box.innerHTML = "<h2>Bons fournisseurs du chantier</h2><div></div>";
      $("#admin-content").append(box);
      await MIRAdminPurchases.render(
        box.querySelector("div"),
        job.purchases.map((p) => p.id),
      );
    }
    await blockers(id);
    const original = await rpc("mir_job_original_estimate", { p_job_id: id });
    if (original)
      $("#admin-content").insertAdjacentHTML(
        "beforeend",
        card(
          "Demande d’origine · " + original.number,
          original.files
            .map(
              (f) =>
                `<p>${esc(f.filename)} · Original soumis ${esc(original.createdAt)} ${button("Télécharger le PDF original", 'data-original="' + f.id + '" data-estimate="' + original.id + '" data-filename="' + esc(f.filename) + '"')}</p>`,
            )
            .join(""),
        ),
      );
  }
  async function renderStaff() {
    const members = data.snapshot.members.filter((m) => m.role === "employee");
    content(
      button("Préparer une fiche employé", "data-new-staff") +
        data.staff
          .map((p) =>
            card(
              p.name,
              `<p>${esc(p.email)} · ${esc(p.team)}</p><p>${{ pending: "En attente", active: "Actif", suspended: "Suspendu" }[p.status]}</p><div class="admin-actions">${button("Modifier", 'data-edit-staff="' + p.id + '"')}${p.user_id ? button("Affecter les chantiers", 'data-assign="' + p.user_id + '"') + button("Permissions", 'data-permissions="' + p.user_id + '"') + button(p.status === "suspended" ? "Réactiver" : "Suspendre", 'data-active="' + p.user_id + '" data-value="' + (p.status === "suspended") + '"') : ""}${p.status !== "suspended" ? button("Inviter / renouveler", 'data-invite="' + p.id + '"') : ""}</div>`,
            ),
          )
          .join("") +
        card(
          "Comptes existants",
          members
            .filter((m) => !data.staff.some((p) => p.user_id === m.id))
            .map(
              (m) =>
                `<p>${esc(m.name)} · ${esc(m.email)} · ${m.active ? "Actif" : "Suspendu"}</p><div class="admin-actions">${button("Préparer la fiche", 'data-profile-member="' + m.id + '"')}${button("Affecter les chantiers", 'data-assign="' + m.id + '"')}${button("Permissions", 'data-permissions="' + m.id + '"')}${button(m.active ? "Suspendre" : "Réactiver", 'data-active="' + m.id + '" data-value="' + !m.active + '"')}</div>`,
            )
            .join(""),
        ),
    );
    const invitations = await rpc("mir_portal_list_invitations");
    $("#admin-content").insertAdjacentHTML(
      "beforeend",
      card(
        "Invitations privées · 72 h",
        invitations
          .map(
            (i) =>
              `<p>${esc(i.email)} · ${esc(i.status)} · ${esc(i.expiresAt)} ${i.status === "pending" ? button("Révoquer", 'data-revoke="' + i.id + '"') : ""}</p>`,
          )
          .join("") || "<p>Aucune invitation.</p>",
      ),
    );
  }
  function staffForm(p = {}) {
    dialog(
      `<form id="admin-staff-form" data-id="${p.id || ""}" data-revision="${p.revision || 0}">${field("Nom", "name", p.name, "text", 'required maxlength="160"')}${field("Courriel", "email", p.email, "email", 'required maxlength="254"')}${field("Équipe", "team", p.team)}<button class="button">Enregistrer la fiche</button></form>`,
    );
  }
  async function catalogue() {
    if (!items.length) {
      const raw = await fetch("catalogue-fd6866b49d21.json").then((r) =>
        r.json(),
      );
      items = MIREmployeeStore.buildCatalogue(raw.materials).filter(
        (i) => !i.referencePending && !i.customBending,
      );
      const seal = await fetch("catalogue-adseal-4580.json").then((r) =>
        r.json(),
      );
      items = items.filter((i) => i.id !== "adseal-4580");
      for (const c of seal.colors.filter((c) =>
        c.formatIds?.includes("tube-304"),
      ))
        items.push({
          id: "adseal-4580-tube-304-" + c.id,
          name: "ADSEAL 4580 · " + c.name + " · Tube 304 ml",
          brand: "Adfast",
          materialId: "adseal-4580",
          manufacturerReference: c.code,
          unit: "cartouche",
          unitLabel: "Tube (cartouche) · 304 ml",
          category: "membranes-joints",
          quantityStep: 1,
          baseColorId: c.id,
          baseColorName: c.name,
          colorPolicy: "none",
          colors: [],
          formats: [],
          measureFields: [],
          dimensions: {},
          packaging: { volumeMl: 304 },
          sourceUrl: seal.sourceUrl,
          active: true,
          referencePending: false,
          notes: ["Référence couleur fabricant; disponibilité à confirmer."],
        });
    }
    content(
      card(
        "Publier une référence au magasin",
        `<p>La référence et son unité sont copiées du catalogue actuel. Aucun stock n’est créé.</p><form id="admin-publish-form"><label>Article<select name="item" required>${items.map((i) => `<option value="${esc(i.id)}">${esc(i.name)} · ${esc(i.unit)}</option>`).join("")}</select></label><button class="button">Publier au magasin employé</button></form>`,
      ) +
        card(
          "Références publiées",
          data.snapshot.catalogue
            .map((i) => `<p>${esc(i.name)} · ${esc(i.unit)}</p>`)
            .join(""),
        ),
    );
  }
  async function render() {
    navigation();
    const params = new URLSearchParams(location.search);
    if (params.get("job")) return renderJob(params.get("job"));
    const section = params.get("section") || "today",
      p = data.snapshot.permissions;
    $("#admin-title").textContent =
      {
        today: "Aujourd’hui",
        staff: "Équipe",
        jobs: "Chantiers",
        orders: "Commandes",
        warehouse: "Entrepôt",
        purchases: "Achats",
        estimates: "Estimations",
        catalogue: "Magasin employé",
      }[section] || "Administration";
    if (section === "today") await renderToday();
    else if (section === "late" && p.coordination) {
      content("");
      await blockers(null, true);
    } else if (section === "jobs" && p.jobs) renderJobs();
    else if (section === "staff" && p.admin) await renderStaff();
    else if (section === "catalogue" && p.admin) await catalogue();
    else if (["orders", "purchases"].includes(section) && p.coordination)
      content(
        (section === "purchases" && p.admin
          ? card(
              "Ajouter un fournisseur",
              `<form id="admin-supplier-form">${field("Nom du fournisseur", "name", "", "text", 'required maxlength="160"')}${field("Courriel vérifié", "email", "", "email", "required")}<label class="admin-check"><input name="confirmed" type="checkbox" required>J’ai vérifié cette adresse auprès du fournisseur.</label><button class="button">Enregistrer le fournisseur</button></form>`,
            )
          : "") +
          card(
            section === "orders"
              ? "Coordination des commandes"
              : "Bons fournisseurs",
            `<a class="button" href="${href("coordination.html", section === "purchases" ? "filter=purchases" : "")}">Ouvrir la coordination</a>`,
          ),
      );
    else if (section === "warehouse" && p.warehouse)
      content(
        card(
          "Entrepôt",
          `<a class="button" href="${href("entrepot.html")}">Ouvrir l’entrepôt</a>`,
        ),
      );
    else if (section === "estimates" && p.estimates) await estimates();
    else throw Error("Cette section ne vous est pas autorisée.");
    if (section === "purchases" && p.coordination) {
      const box = document.createElement("section");
      $("#admin-content").append(box);
      const rows = await rpc("mir_supplier_orders_list");
      await MIRAdminPurchases.render(
        box,
        rows.map((r) => r.id),
        {
          pendingOnly:
            new URLSearchParams(location.search).get("filter") === "to-send",
        },
      );
    }
  }
  async function estimates() {
    estimateRows = await rpc("mir_estimate_inbox");
    estimateOwners = await rpc("mir_estimate_owners");
    content(
      estimateRows
        .map((r) =>
          card(
            r.number,
            `<p>${esc(r.name)} · ${esc(r.source)} · ${esc(r.createdAt)}</p><p>${esc({ new: "À trier", reviewing: "En cours", accepted: "Acceptée", declined: "Refusée" }[r.status])} · ${esc(r.nextFollowup || "Date de relance à confirmer")}</p><a class="button secondary" href="${href("estimation-dossier.html", "id=" + r.id)}">Dossier soumis et PDF originaux</a><form data-estimate-followup="${r.id}"><label>Statut<select name="status">${["new", "reviewing", "accepted", "declined"].map((k) => `<option value="${k}" ${r.status === k ? "selected" : ""}>${{ new: "À trier", reviewing: "En cours", accepted: "Acceptée", declined: "Refusée" }[k]}</option>`).join("")}</select></label><label>Responsable<select name="owner"><option value="">À attribuer</option>${estimateOwners.map((m) => `<option value="${m.id}" ${r.ownerId === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>${field("Prochaine relance", "date", r.nextFollowup, "date")}<button class="button">Enregistrer le suivi</button></form>${r.jobId ? `<a class="button secondary" href="${href("administration.html", "job=" + r.jobId)}">Chantier créé</a>` : r.status === "accepted" && data.snapshot.permissions.jobs ? button("Créer le chantier", 'data-estimate-job="' + r.id + '"') : ""}`,
          ),
        )
        .join("") || card("Estimations", "<p>Aucune demande reçue.</p>"),
    );
  }
  async function run(fn) {
    if (busy) return;
    busy = true;
    document
      .querySelectorAll("#admin-content button,#admin-dialog-body button")
      .forEach((b) => (b.disabled = true));
    try {
      status("Vérification auprès du serveur…");
      await fn();
      if ($("#admin-status").textContent === "Vérification auprès du serveur…")
        status("Enregistré et confirmé par le serveur.");
    } catch (e) {
      status(e.message || "Action interrompue. Votre saisie est conservée.");
    } finally {
      busy = false;
      document
        .querySelectorAll("#admin-content button,#admin-dialog-body button")
        .forEach((b) => (b.disabled = false));
    }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    run(async () => {
      if (b.dataset.estimateJob) {
        dialog(
          `<form id="admin-estimate-job-form" data-estimate="${b.dataset.estimateJob}">${field("Numéro de job", "number", "", "text", 'required maxlength="40"')}${field("Nom du chantier", "name", "", "text", 'required maxlength="160"')}<button class="button">Créer le chantier</button></form>`,
        );
      }
      if (b.hasAttribute("data-new-job")) dialog(jobForm());
      if (b.hasAttribute("data-edit-job"))
        dialog(
          jobForm({
            id: job.id,
            number: job.job_number,
            name: job.name,
            address: job.delivery_address,
            team: job.team,
            foreman: job.foreman,
            requiredDate: job.required_date,
            archived: job.archived,
            revision: job.revision,
          }),
        );
      if (b.hasAttribute("data-new-staff")) staffForm();
      if (b.dataset.editStaff)
        staffForm(data.staff.find((p) => p.id === b.dataset.editStaff));
      if (b.dataset.profileMember)
        staffForm(
          data.snapshot.members.find((p) => p.id === b.dataset.profileMember),
        );
      if (b.dataset.active) {
        await action("SET_MEMBER_ACTIVE", {
          memberId: b.dataset.active,
          active: b.dataset.value === "true",
        });
        await renderStaff();
      }
      if (b.dataset.assign) {
        const m = data.snapshot.members.find((m) => m.id === b.dataset.assign);
        dialog(
          `<h2>Affecter ${esc(m.name)}</h2><form id="admin-assignment-form" data-member="${m.id}">${data.snapshot.jobs.map((j) => `<label class="admin-check"><input type="checkbox" name="jobs" value="${j.id}" ${j.assignedMemberIds.includes(m.id) ? "checked" : ""}>${esc(j.number || "")} · ${esc(j.name)}</label>`).join("")}<button class="button">Enregistrer les affectations</button></form>`,
        );
      }
      if (b.dataset.permissions) {
        const current = await rpc("mir_admin_member_permissions", {
          p_member_id: b.dataset.permissions,
        });
        dialog(
          `<h2>Permissions internes</h2><form id="admin-permissions-form" data-member="${b.dataset.permissions}">${[
            ["coordination", "Adjointe · coordination"],
            ["warehouse", "Entrepôt"],
            ["jobs", "Gestion des jobs (avec Adjointe)"],
            ["estimates", "Estimations (avec Adjointe)"],
          ]
            .map(
              ([id, label]) =>
                `<label class="admin-check"><input type="checkbox" name="${id}" ${current[id] ? "checked" : ""}>${label}</label>`,
            )
            .join(
              "",
            )}<button class="button">Enregistrer les permissions</button></form>`,
        );
      }
      if (b.dataset.invite) {
        const p = data.staff.find((p) => p.id === b.dataset.invite);
        dialog(
          `<h2>Inviter ${esc(p.name)}</h2><form id="admin-invite-form" data-profile="${p.id}">${data.snapshot.jobs.map((j) => `<label class="admin-check"><input type="checkbox" name="jobs" value="${j.id}">${esc(j.number || "")} · ${esc(j.name)}</label>`).join("")}<p>Renouveler révoque les anciens liens ouverts pour cette personne.</p><button class="button">Créer le lien privé de 72 h</button></form>`,
        );
      }
      if (b.dataset.revoke) {
        await rpc("mir_account_revoke_invitation", { p_id: b.dataset.revoke });
        await renderStaff();
      }
      if (b.dataset.original) {
        const { data: blob, error } = await db.storage
          .from("mir-estimates")
          .download(b.dataset.estimate + "/" + b.dataset.original + ".pdf");
        if (error) throw error;
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = b.dataset.filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      if (b.dataset.download) {
        const d = job.documents.find((d) => d.id === b.dataset.download);
        const { data: blob, error } = await db.storage
          .from("mir-job-documents")
          .download(d.object_path);
        if (error) throw error;
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = d.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    });
  });
  document.addEventListener("submit", (e) => {
    const f = e.target;
    if (
      (!f.id.startsWith("admin-") && !f.dataset.estimateFollowup) ||
      f.method === "dialog"
    )
      return;
    e.preventDefault();
    run(async () => {
      const v = new FormData(f);
      if (f.dataset.estimateFollowup) {
        const r = estimateRows.find((r) => r.id === f.dataset.estimateFollowup);
        await rpc("mir_estimate_followup", {
          p_id: r.id,
          p_status: v.get("status"),
          p_owner: v.get("owner") || null,
          p_date: v.get("date") || null,
          p_revision: r.revision,
        });
        await estimates();
        return;
      }
      if (f.id === "admin-estimate-job-form") {
        const r = await rpc("mir_estimate_create_job", {
          p_id: f.dataset.estimate,
          p_number: v.get("number"),
          p_name: v.get("name"),
        });
        location.href = href("administration.html", "job=" + r.jobId);
        return;
      }
      if (f.id === "admin-search") {
        const r = await rpc("mir_admin_search", {
          p_search: String(v.get("search") || ""),
        });
        $("#admin-results").innerHTML =
          r
            .map(
              (j) =>
                `<p><a href="${esc(href(j.type === "job" ? "administration.html" : "coordination.html", (j.type === "job" ? "job=" : j.type === "order" ? "order=" : "purchase=") + j.id))}">${esc(j.label)}</a></p>`,
            )
            .join("") || "<p>Aucun résultat accessible.</p>";
        return;
      }
      if (f.id === "admin-job-form") {
        const payload = Object.fromEntries(v);
        if (f.dataset.id) {
          payload.jobId = f.dataset.id;
          payload.revision = Number(f.dataset.revision);
          payload.archived = v.has("archived");
        }
        const r = await action(
          f.dataset.id ? "UPDATE_JOB" : "CREATE_JOB",
          payload,
        );
        location.href = href("administration.html", "job=" + r.jobId);
        return;
      }
      if (f.id === "admin-staff-form") {
        const p = Object.fromEntries(v);
        if (f.dataset.id) {
          p.profileId = f.dataset.id;
          p.revision = Number(f.dataset.revision);
        }
        await action("SAVE_STAFF", p);
        $("#admin-dialog").close();
        await renderStaff();
      }
      if (f.id === "admin-assignment-form") {
        const ids = v.getAll("jobs");
        const r = await action("ASSIGN_MEMBER_JOBS", {
          memberId: f.dataset.member,
          jobIds: ids,
        });
        $("#admin-dialog").close();
        await renderStaff();
        status(
          "Affectation confirmée : " +
            r.jobIds.length +
            " chantier(s) enregistrés.",
        );
      }
      if (f.id === "admin-permissions-form") {
        await action("SET_PERMISSIONS", {
          memberId: f.dataset.member,
          ...Object.fromEntries(
            ["coordination", "warehouse", "jobs", "estimates"].map((k) => [
              k,
              v.has(k),
            ]),
          ),
        });
        $("#admin-dialog").close();
        await renderStaff();
      }
      if (f.id === "admin-invite-form") {
        const p = data.staff.find((p) => p.id === f.dataset.profile),
          id = f.dataset.request || (f.dataset.request = crypto.randomUUID());
        const r = await rpc("mir_admin_invite", {
          p_profile_id: p.id,
          p_job_ids: v.getAll("jobs"),
          p_request_id: id,
        });
        if (!r.activationPath)
          throw Error(
            "Invitation déjà créée. Renouvelez-la pour obtenir un nouveau lien.",
          );
        const url = new URL(r.activationPath, location.href);
        if (test) url.searchParams.set("recette", "1");
        dialog(
          `<h2>Invitation créée · 72 h</h2><p>À transmettre uniquement à ${esc(p.email)}. Aucun courriel automatique n’a été envoyé.</p><label>Lien privé<input readonly value="${esc(url.href)}" aria-label="Lien privé d’invitation"></label>`,
        );
        await renderStaff();
      }
      if (f.id === "admin-supplier-form") {
        await action("SAVE_SUPPLIER", {
          name: v.get("name"),
          email: v.get("email"),
          confirmed: v.has("confirmed"),
        });
        f.reset();
        return;
      }
      if (f.id === "admin-publish-form") {
        const item = items.find((i) => i.id === v.get("item"));
        await action("PUBLISH_CATALOGUE", { item });
        await catalogue();
      }
      if (f.id === "admin-document-form") {
        const file = v.get("file");
        if (
          !file?.size ||
          file.size > 20971520 ||
          ![
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
          ].includes(file.type)
        )
          throw Error(
            "Choisissez un PDF ou une image acceptée de 20 Mio maximum.",
          );
        const family =
            v.get("family") ||
            f.dataset.family ||
            (f.dataset.family = crypto.randomUUID()),
          versions = job.documents.filter((d) => d.family_id === family),
          version = Math.max(0, ...versions.map((d) => d.version)),
          extension = {
            "application/pdf": "pdf",
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
          }[file.type];
        const path =
          f.dataset.path ||
          (f.dataset.path =
            data.snapshot.organizationId +
            "/" +
            job.id +
            "/" +
            family +
            "/" +
            crypto.randomUUID() +
            "." +
            extension);
        const actual = path.replace(
          "undefined/",
          (await rpc("mir_account_snapshot")).organizationId + "/",
        );
        const { error } = await db.storage
          .from("mir-job-documents")
          .upload(actual, new Uint8Array(await file.arrayBuffer()), {
            upsert: false,
            contentType: file.type,
          });
        if (error && !/already exists|duplicate/i.test(error.message))
          throw error;
        await rpc("mir_job_document_commit", {
          p_job_id: job.id,
          p_family_id: family,
          p_object_path: actual,
          p_name: file.name,
          p_expected_version: version,
        });
        await renderJob(job.id);
      }
    });
  });
  try {
    const { data: u, error } = await db.auth.getUser();
    if (error || !u.user) {
      status(
        "Connectez-vous à Mon compte pour accéder à votre administration.",
      );
      content(
        `<a class="button" href="${href("chantier.html")}">Mon compte</a>`,
      );
      return;
    }
    identity = u.user;
    if (new URLSearchParams(location.search).get("job")) {
      try {
        await refresh();
      } catch (e) {
        if (e.code !== "42501") throw e;
      }
      if (data) navigation();
      await renderJob(new URLSearchParams(location.search).get("job"));
    } else {
      await refresh();
      await render();
    }
    status(
      test
        ? "MIR TEST · données serveur de recette."
        : "Données serveur MIR · accès vérifié.",
    );
  } catch (e) {
    content("");
    status(e.message || "Accès non autorisé.");
  }
})();
