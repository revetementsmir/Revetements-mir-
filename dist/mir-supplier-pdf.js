/* Supplier-facing content only. Internal snapshots remain in the private record. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MIRSupplierPDF = api;
})(typeof window === "object" ? window : null, function () {
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
          "'": "&apos;",
        })[c],
    );
  const clean = (v) =>
    String(v ?? "")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  function wrap(value, max) {
    const out = [];
    let line = "";
    for (const word of clean(value).split(" ")) {
      if ((line + " " + word).trim().length > max && line) {
        out.push(line);
        line = "";
      }
      if (word.length > max) {
        if (line) {
          out.push(line);
          line = "";
        }
        for (let i = 0; i < word.length; i += max)
          out.push(word.slice(i, i + max));
      } else line = (line + " " + word).trim();
    }
    if (line) out.push(line);
    return out.length ? out : [""];
  }
  function text(
    x,
    y,
    value,
    {
      size = 15,
      bold = false,
      color = "#172d22",
      width = 40,
      lineHeight = 21,
    } = {},
  ) {
    return wrap(value, width)
      .map(
        (s, i) =>
          `<text x="${x}" y="${y + i * lineHeight}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${color}">${esc(s)}</text>`,
      )
      .join("");
  }
  function row(line, index) {
    const s = line.specification || {},
      snap = s.snapshot || {},
      pack = s.packaging || snap.packaging || {},
      format =
        s.formatLabel ||
        snap.formatLabel ||
        (pack.volumeMl ? "Tube · " + pack.volumeMl + " ml" : ""),
      ref =
        s.manufacturerReference ||
        snap.manufacturerReference ||
        s.format?.manufacturerCode ||
        "À confirmer",
      color =
        s.colorName ||
        s.baseColorName ||
        snap.colorName ||
        "Sans teinte précisée",
      name =
        s.materialId === "adseal-4580" || s.itemId?.startsWith("adseal-4580")
          ? "Scellant silicone ADSEAL 4580"
          : s.name || s.itemName || snap.name || "Article à préciser",
      dims = Object.entries(s.dimensionsIn || {})
        .map(([key, n]) => key + " : " + n + " po")
        .join(" · "),
      details = [s.brand || snap.brand, format, dims]
        .filter(Boolean)
        .join(" · "),
      count = new Intl.NumberFormat("fr-CA", {
        maximumFractionDigits: 3,
      }).format(Number(line.quantity));
    const height = Math.max(
      98,
      36 + wrap(name, 33).length * 22 + wrap(details, 43).length * 18,
      35 + wrap(ref, 22).length * 20 + wrap(color, 23).length * 19,
    );
    return {
      index: index + 1,
      name,
      details,
      ref,
      color,
      count,
      unit:
        Number(line.quantity) > 1 &&
        [
          "cartouche",
          "tube",
          "pièce",
          "boîte",
          "rouleau",
          "longueur",
          "feuille",
          "kit",
          "contenant",
          "saucisse",
        ].includes(line.unit)
          ? line.unit + "s"
          : line.unit || "À confirmer",
      height,
    };
  }
  function buildOptions(
    po,
    {
      test = false,
      logo = "",
      date = new Date().toISOString().slice(0, 10),
    } = {},
  ) {
    if (!po?.snapshot || !Array.isArray(po.lines) || !po.lines.length)
      throw Error("Un bon serveur avec ses articles est requis.");
    const rows = po.lines.map(row),
      pages = [];
    let current = [],
      height = 0;
    for (const r of rows) {
      if (r.height > 420)
        throw Error(
          "Une désignation est trop longue pour le bon. Corrigez la fiche article avant le PDF.",
        );
      if (height + r.height > 440 && current.length) {
        pages.push(current);
        current = [];
        height = 0;
      }
      current.push(r);
      height += r.height;
    }
    if (current.length) pages.push(current);
    const expected = po.expectedDate || po.snapshot.requestedDate,
      expectedLabel =
        expected && /^\d{4}-\d{2}-\d{2}$/.test(expected)
          ? new Intl.DateTimeFormat("fr-CA", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(expected + "T12:00:00Z"))
          : "À confirmer";
    const number = clean(po.snapshot.poNumber || po.order_number || "Bon MIR"),
      revision = Number(po.revision) || 1,
      job = clean(po.snapshot.job || "À confirmer"),
      address = clean(po.snapshot.address || "À confirmer"),
      correction = po.snapshot.documentCorrection === true;
    const faces = pages.map((page, i) => {
      let y = 382;
      const lines = page
        .map((r) => {
          const top = y;
          y += r.height;
          return (
            `<rect x="48" y="${top}" width="754" height="${r.height}" fill="${r.index % 2 ? "#f5f7f4" : "#ffffff"}"/><line x1="48" y1="${y}" x2="802" y2="${y}" stroke="#dbe2dc"/>` +
            text(61, top + 28, r.index, {
              size: 13,
              width: 3,
              color: "#69786c",
            }) +
            text(93, top + 28, r.name, {
              size: 18,
              bold: true,
              width: 33,
              lineHeight: 23,
            }) +
            text(93, top + 34 + wrap(r.name, 33).length * 23, r.details, {
              size: 13,
              width: 43,
              lineHeight: 18,
              color: "#536256",
            }) +
            text(458, top + 28, r.ref, {
              size: 16,
              bold: true,
              width: 22,
              lineHeight: 21,
            }) +
            text(458, top + 35 + wrap(r.ref, 22).length * 21, r.color, {
              size: 14,
              width: 23,
              lineHeight: 19,
            }) +
            text(677, top + 30, r.count, { size: 21, bold: true, width: 6 }) +
            text(738, top + 29, r.unit, { size: 12, width: 11, lineHeight: 18 })
          );
        })
        .join("");
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="850" height="1100" viewBox="0 0 850 1100"><rect width="850" height="1100" fill="white"/><rect width="850" height="9" fill="#274b36"/>${logo ? `<image x="48" y="37" width="260" height="65" href="${esc(logo)}"/>` : text(48, 78, "Les Revêtements MIR", { size: 28, bold: true, width: 26 })}${text(493, 60, "BON DE COMMANDE", { size: 22, bold: true, width: 28 })}${text(493, 91, number, { size: 18, bold: true, width: 30 })}${text(493, 116, "RÉVISION " + revision + "  ·  " + date, { size: 13, color: "#536256", width: 40 })}<line x1="48" y1="143" x2="802" y2="143" stroke="#d3ded4"/>${test ? '<rect x="48" y="158" width="754" height="31" rx="4" fill="#fff0c4"/>' + text(62, 179, "RECETTE FICTIVE — NE PAS TRAITER", { size: 14, bold: true, width: 80, color: "#694b00" }) : text(48, 178, "LES REVÊTEMENTS MIR", { size: 13, bold: true, width: 45 })}${text(48, 218, "FOURNISSEUR", { size: 11, bold: true, width: 34, color: "#647768" })}${text(48, 247, po.supplier?.name || "À confirmer", { size: 19, bold: true, width: 32, lineHeight: 25 })}${text(440, 218, "CHANTIER ET LIVRAISON", { size: 11, bold: true, width: 35, color: "#647768" })}${text(440, 245, job, { size: 17, bold: true, width: 37, lineHeight: 22 })}${text(440, 249 + wrap(job, 37).length * 22, address, { size: 15, width: 42, lineHeight: 21 })}<rect x="48" y="347" width="754" height="35" rx="3" fill="#274b36"/>${text(61, 370, "N°", { size: 11, bold: true, color: "#ffffff" })}${text(93, 370, "ARTICLE ET FORMAT", { size: 12, bold: true, color: "#ffffff" })}${text(458, 370, "RÉFÉRENCE / TEINTE", { size: 12, bold: true, color: "#ffffff" })}${text(670, 370, "QTÉ", { size: 12, bold: true, color: "#ffffff" })}${text(738, 370, "UNITÉ", { size: 12, bold: true, color: "#ffffff" })}${lines}<rect x="48" y="858" width="754" height="${correction ? 112 : 92}" rx="5" fill="#f1f5ef"/>${text(64, 884, correction ? "CORRECTION DU DOCUMENT" : "À CONFIRMER PAR LE FOURNISSEUR", { size: 12, bold: true, width: 85 })}${text(64, 908, correction ? "Correction de présentation uniquement. Aucune quantité supplémentaire à commander. Ce PDF remplace la présentation de la révision " + (revision - 1) + "." : "Veuillez confirmer la disponibilité, les références, les quantités et la date de livraison avant préparation.", { size: 14, width: 85, lineHeight: 21 })}${text(48, 1007, "Date souhaitée : " + expectedLabel, { size: 14, width: 80 })}<line x1="48" y1="1031" x2="802" y2="1031" stroke="#d3ded4"/>${text(48, 1054, "Les Revêtements MIR · revetementsmir.com", { size: 11, width: 85, color: "#647768" })}${text(713, 1054, i + 1 + " / " + pages.length, { size: 11, width: 12, color: "#647768" })}</svg>`;
      return { name: number + " · R" + revision, layout: "bending-sheet", svg };
    });
    return {
      title: number,
      subtitle: "Bon fournisseur",
      filename: number + "-R" + revision + ".pdf",
      faces,
    };
  }
  return Object.freeze({ buildOptions, version: "1.0.0" });
});
