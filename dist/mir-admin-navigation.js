/* Keep a recipe in its own backend when moving between existing MIR modules. */
(() => {
  "use strict";
  if (new URLSearchParams(location.search).get("recette") !== "1") return;
  const known = new Set([
    "chantier.html",
    "administration.html",
    "coordination.html",
    "entrepot.html",
    "espace-partage.html",
    "estimation-dossier.html",
    "estimation.html",
    "production.html",
    "metres.html",
  ]);
  function links(root) {
    const nodes = [
      ...(root.matches?.("a[href]") ? [root] : []),
      ...root.querySelectorAll("a[href]"),
    ];
    for (const a of nodes) {
      const u = new URL(a.href, location.href);
      if (
        u.origin === location.origin &&
        known.has(u.pathname.split("/").pop())
      ) {
        u.searchParams.set("recette", "1");
        a.href = u.href;
      }
    }
  }
  links(document);
  new MutationObserver((rows) =>
    rows.forEach((r) =>
      r.addedNodes.forEach((n) => {
        if (n.nodeType === 1) links(n);
      }),
    ),
  ).observe(document.body, { childList: true, subtree: true });
})();
