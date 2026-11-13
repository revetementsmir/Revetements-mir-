/* UNICO reference data, researched from the official site.
 * Colour hex values reproduce its web swatches; they are not measured colour standards.
 * A published collection swatch is not a confirmed U-P1 material/finish variant.
 * MIR confirmed 3 CAD per square inch for Unico aluminium; custom colours require a quote.
 */
(function (root, factory) {
  'use strict';
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  if (root) root.MIRUnico = data;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  function freeze(value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.values(value).forEach(freeze); Object.freeze(value);
    }
    return value;
  }
  return freeze({
  "schema": "mir-unico-reference-1",
  "version": "1.0.0",
  "verifiedAt": "2026-11-04T03:01:02Z",
  "brand": "UNICO",
  "sourceScope": "official_unico_only",
  "products": [
    {
      "id": "u-p1",
      "name": "U-P1",
      "label": "U-P1 — Panneau architectural plié",
      "brand": "UNICO",
      "family": "architectural_panel",
      "manufacturing": "folded",
      "extruded": false,
      "materialIds": [
        "acier",
        "aluminium"
      ],
      "orientations": [
        "horizontal",
        "vertical"
      ],
      "sourceUrl": "https://unicorevetement.com/produits/u-p1",
      "documentIds": [
        "unico-u-p1-technical",
        "unico-u-p1-engineering",
        "unico-u-p1-order-form"
      ],
      "image": {
        "src": "assets/unico/u-p1.png",
        "sourceUrl": "https://unicorevetement.com/product-renders/transparent/u-p1.png",
        "alt": "Rendu officiel du profil U-P1",
        "kind": "official_product_render",
        "width": 1536,
        "height": 1024,
        "transparent": true,
        "variantColorConfirmed": false
      },
      "installation": {
        "jointNominalIn": 1,
        "jointValueIsEnforced": false,
        "fixing": "vis dans le joint",
        "coverCapOffered": true,
        "requiresProjectValidation": true,
        "sourceUrl": "https://unicorevetement.com/produits/u-p1"
      },
      "dimensions": {
        "basis": "outer",
        "publishedPageSummaryIn": [
          {
            "materialId": "acier",
            "width": 118,
            "height": 46
          },
          {
            "materialId": "aluminium",
            "width": 142,
            "height": 58
          }
        ],
        "enforcedMaximum": null,
        "status": "requires_supplier_confirmation",
        "reason": "Les cotes impériales et métriques du PDF comportent des incohérences; aucune limite automatique n’est appliquée."
      },
      "finishFamilies": [
        "peint",
        "imitation bois",
        "anodisé",
        "inox"
      ],
      "finishCompatibilityConfirmed": false,
      "paletteSelectionIsComplete": false,
      "stockStatus": "unknown",
      "commercialStatus": "reference_request_only"
    }
  ],
  "materials": [
    {
      "id": "acier",
      "label": "Acier prépeint — U-P1",
      "modelType": "acier",
      "manufacturing": "folded",
      "productIds": [
        "u-p1"
      ],
      "gauges": [
        18,
        20,
        22
      ],
      "thicknessesMM": [],
      "gaugeConversionApplied": false,
      "paletteIds": [
        "standard",
        "signature"
      ],
      "sourceUrl": "https://unicorevetement.com/produits/u-p1",
      "technicalSourceUrl": "https://unicorevetement.com/s/Unico_U-P1_FT.pdf",
      "needsVariantConfirmation": true
    },
    {
      "id": "aluminium",
      "label": "Aluminium plié — U-P1",
      "modelType": "aluminium",
      "manufacturing": "folded",
      "extruded": false,
      "productIds": [
        "u-p1"
      ],
      "gauges": [],
      "thicknessesMM": [
        2,
        3.2
      ],
      "thicknessUnit": "mm",
      "paletteIds": [
        "vitalium"
      ],
      "coatingSpecificationsMentioned": [
        "AAMA 2604",
        "AAMA 2605"
      ],
      "sourceUrl": "https://unicorevetement.com/produits/u-p1",
      "technicalSourceUrl": "https://unicorevetement.com/s/Unico_U-P1_FT.pdf",
      "needsVariantConfirmation": true,
      "finishNote": "La sélection Vitalium est publiée sur 1 mm; sa transposition au U-P1 2/3,2 mm nécessite confirmation."
    }
  ],
  "palettes": [
    {
      "id": "standard",
      "name": "Standard",
      "label": "Collection Standard",
      "materialId": "acier",
      "finishSystem": "SMP",
      "isCompleteChart": false,
      "scope": "published_website_selection",
      "sourceUrl": "https://unicorevetement.com/couleurs",
      "sourceId": "unico-colours-page",
      "hexSource": "official_website_css",
      "displayColorOnly": true,
      "productCompatibilityConfirmed": false,
      "colors": [
        {
          "id": "unico-qc-28783",
          "name": "Blanc vif",
          "code": "QC-28783",
          "codeStatus": "published",
          "collectionId": "standard",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#f1f1ed",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#f1f1ed",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Le calibre de cet échantillon n’est pas précisé dans cette sélection publiée."
          }
        },
        {
          "id": "unico-qc-28260",
          "name": "Bleu ardoise",
          "code": "QC-28260",
          "codeStatus": "published",
          "collectionId": "standard",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#315f72",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#315f72",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Le calibre de cet échantillon n’est pas précisé dans cette sélection publiée."
          }
        },
        {
          "id": "unico-qc-28314",
          "name": "Gris foncé",
          "code": "QC-28314",
          "codeStatus": "published",
          "collectionId": "standard",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#3d4141",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#3d4141",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Le calibre de cet échantillon n’est pas précisé dans cette sélection publiée."
          }
        },
        {
          "id": "unico-qc-28306",
          "name": "Fusain",
          "code": "QC-28306",
          "codeStatus": "published",
          "collectionId": "standard",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#4e4e4b",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#4e4e4b",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Le calibre de cet échantillon n’est pas précisé dans cette sélection publiée."
          }
        },
        {
          "id": "unico-qc-28262",
          "name": "Noir",
          "code": "QC-28262",
          "codeStatus": "published",
          "collectionId": "standard",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#151616",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#151616",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Le calibre de cet échantillon n’est pas précisé dans cette sélection publiée."
          }
        },
        {
          "id": "unico-qc-28259",
          "name": "Rouge tuile",
          "code": "QC-28259",
          "codeStatus": "published",
          "collectionId": "standard",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#a33b32",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#a33b32",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Le calibre de cet échantillon n’est pas précisé dans cette sélection publiée."
          }
        }
      ]
    },
    {
      "id": "signature",
      "name": "Signature",
      "label": "Collection Signature",
      "materialId": "acier",
      "finishSystem": "PVDF / polyester",
      "isCompleteChart": false,
      "scope": "published_website_selection",
      "sourceUrl": "https://unicorevetement.com/couleurs",
      "sourceId": "unico-colours-page",
      "hexSource": "official_website_css",
      "displayColorOnly": true,
      "productCompatibilityConfirmed": false,
      "colors": [
        {
          "id": "unico-u-002",
          "name": "Beige manuscrit",
          "code": "U-002",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#c7b994",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#c7b994",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24,
            22
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "matching_published_gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [
              22
            ],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Un calibre publié correspond au U-P1; la combinaison produit, fini et disponibilité reste à confirmer."
          }
        },
        {
          "id": "unico-u-003",
          "name": "Beige sable",
          "code": "U-003",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#aa9879",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#aa9879",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            26
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        },
        {
          "id": "unico-u-015",
          "name": "Vert héritage",
          "code": "U-015",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#40564b",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#40564b",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        },
        {
          "id": "unico-u-019",
          "name": "Gris urbain",
          "code": "U-019",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#59616e",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#59616e",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24,
            22
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "matching_published_gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [
              22
            ],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Un calibre publié correspond au U-P1; la combinaison produit, fini et disponibilité reste à confirmer."
          }
        },
        {
          "id": "unico-u-016",
          "name": "Bleu soir",
          "code": "U-016",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#556674",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#556674",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        },
        {
          "id": "unico-u-021",
          "name": "Gris classique",
          "code": "U-021",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "solid",
          "hex": "#aaaca5",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#aaaca5",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24,
            22
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "matching_published_gauge_to_confirm",
            "confirmed": false,
            "matchingGauges": [
              22
            ],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Un calibre publié correspond au U-P1; la combinaison produit, fini et disponibilité reste à confirmer."
          }
        },
        {
          "id": "unico-u-041",
          "name": "Bois blond",
          "code": "U-041",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "texture",
          "hex": "#9a7150",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": "assets/unico/frene.jpg",
          "swatchSourceUrl": "https://unicorevetement.com/colors/textures/frene.jpg",
          "officialCSS": "background-image:url(/colors/textures/frene.jpg);background-color:#9a7150",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        },
        {
          "id": "unico-u-026",
          "name": "Bois caramel",
          "code": "U-026",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "texture",
          "hex": "#8f5730",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": "assets/unico/caramel.jpg",
          "swatchSourceUrl": "https://unicorevetement.com/colors/textures/caramel.jpg",
          "officialCSS": "background-image:url(/colors/textures/caramel.jpg);background-color:#8f5730",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        },
        {
          "id": "unico-u-033",
          "name": "Bois de rose",
          "code": "U-033",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "texture",
          "hex": "#774323",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": "assets/unico/sienne.jpg",
          "swatchSourceUrl": "https://unicorevetement.com/colors/textures/sienne.jpg",
          "officialCSS": "background-image:url(/colors/textures/sienne.jpg);background-color:#774323",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        },
        {
          "id": "unico-u-031",
          "name": "Bois de chêne",
          "code": "U-031",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "texture",
          "hex": "#a3773f",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": "assets/unico/chene.jpg",
          "swatchSourceUrl": "https://unicorevetement.com/colors/textures/chene.jpg",
          "officialCSS": "background-image:url(/colors/textures/chene.jpg);background-color:#a3773f",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        },
        {
          "id": "unico-u-035",
          "name": "Bois d’écorce",
          "code": "U-035",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "texture",
          "hex": "#7a7670",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": "assets/unico/ecorce-grise.jpg",
          "swatchSourceUrl": "https://unicorevetement.com/colors/textures/ecorce-grise.jpg",
          "officialCSS": "background-image:url(/colors/textures/ecorce-grise.jpg);background-color:#7a7670",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        },
        {
          "id": "unico-u-045",
          "name": "Acier oxydé",
          "code": "U-045",
          "codeStatus": "published",
          "collectionId": "signature",
          "materialId": "acier",
          "kind": "texture",
          "hex": "#7c4938",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": "assets/unico/corten-acier.jpg",
          "swatchSourceUrl": "https://unicorevetement.com/colors/textures/corten-acier.jpg",
          "officialCSS": "background-image:url(/colors/textures/corten-acier.jpg);background-color:#7c4938",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": [
            24
          ],
          "publishedThicknessesMM": null,
          "uP1Compatibility": {
            "status": "published_gauge_outside_u_p1",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Les calibres publiés pour cet échantillon ne sont pas les calibres du U-P1."
          }
        }
      ]
    },
    {
      "id": "vitalium",
      "name": "Vitalium",
      "label": "Collection Vitalium",
      "materialId": "aluminium",
      "finishSystem": "AAMA 2605",
      "isCompleteChart": false,
      "scope": "published_website_selection",
      "sourceUrl": "https://unicorevetement.com/couleurs",
      "sourceId": "unico-colours-page",
      "hexSource": "official_website_css",
      "displayColorOnly": true,
      "productCompatibilityConfirmed": false,
      "colors": [
        {
          "id": "unico-ua-013",
          "name": "Bleu océan",
          "code": "UA-013",
          "codeStatus": "published",
          "collectionId": "vitalium",
          "materialId": "aluminium",
          "kind": "solid",
          "hex": "#177299",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#177299",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": [
            1.0
          ],
          "uP1Compatibility": {
            "status": "finish_request_only",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Échantillon publié sur aluminium de 1 mm; disponibilité sur U-P1 de 2 ou 3,2 mm à confirmer."
          }
        },
        {
          "id": "unico-graphite",
          "name": "Graphite",
          "code": null,
          "codeStatus": "not_published",
          "collectionId": "vitalium",
          "materialId": "aluminium",
          "kind": "solid",
          "hex": "#525553",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#525553",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": [
            1.0
          ],
          "uP1Compatibility": {
            "status": "finish_request_only",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Échantillon publié sur aluminium de 1 mm; disponibilité sur U-P1 de 2 ou 3,2 mm à confirmer."
          }
        },
        {
          "id": "unico-ua-007",
          "name": "Anthracite",
          "code": "UA-007",
          "codeStatus": "published",
          "collectionId": "vitalium",
          "materialId": "aluminium",
          "kind": "solid",
          "hex": "#363a39",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#363a39",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": [
            1.0
          ],
          "uP1Compatibility": {
            "status": "finish_request_only",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Échantillon publié sur aluminium de 1 mm; disponibilité sur U-P1 de 2 ou 3,2 mm à confirmer."
          }
        },
        {
          "id": "unico-ua-012",
          "name": "Rouge cuivré",
          "code": "UA-012",
          "codeStatus": "published",
          "collectionId": "vitalium",
          "materialId": "aluminium",
          "kind": "solid",
          "hex": "#a84935",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#a84935",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": [
            1.0
          ],
          "uP1Compatibility": {
            "status": "finish_request_only",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Échantillon publié sur aluminium de 1 mm; disponibilité sur U-P1 de 2 ou 3,2 mm à confirmer."
          }
        },
        {
          "id": "unico-ua-005",
          "name": "Gris taupe",
          "code": "UA-005",
          "codeStatus": "published",
          "collectionId": "vitalium",
          "materialId": "aluminium",
          "kind": "solid",
          "hex": "#777266",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#777266",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": [
            1.0
          ],
          "uP1Compatibility": {
            "status": "finish_request_only",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Échantillon publié sur aluminium de 1 mm; disponibilité sur U-P1 de 2 ou 3,2 mm à confirmer."
          }
        },
        {
          "id": "unico-corten-alu",
          "name": "Corten alu",
          "code": null,
          "codeStatus": "not_published",
          "collectionId": "vitalium",
          "materialId": "aluminium",
          "kind": "solid",
          "hex": "#765142",
          "hexSource": "official_website_css",
          "hexIsColorimetricSpecification": false,
          "swatchImage": null,
          "swatchSourceUrl": null,
          "officialCSS": "background-color:#765142",
          "sourceUrl": "https://unicorevetement.com/couleurs",
          "publishedGauges": null,
          "publishedThicknessesMM": [
            1.0
          ],
          "uP1Compatibility": {
            "status": "finish_request_only",
            "confirmed": false,
            "matchingGauges": [],
            "matchingThicknessesMM": [],
            "orderableAsVerifiedVariant": false,
            "note": "Échantillon publié sur aluminium de 1 mm; disponibilité sur U-P1 de 2 ou 3,2 mm à confirmer."
          }
        }
      ]
    }
  ],
  "documents": [
    {
      "id": "unico-u-p1-technical",
      "title": "U-P1 — Fiche technique",
      "kind": "technical",
      "url": "https://unicorevetement.com/s/Unico_U-P1_FT.pdf",
      "format": "pdf",
      "pageCount": 35,
      "sourceProductId": "u-p1",
      "containsInstallationDetails": true,
      "containsDimensionalConflicts": true,
      "downloadMirrored": false
    },
    {
      "id": "unico-u-p1-engineering",
      "title": "U-P1 — Attestation d’ingénierie",
      "kind": "engineering_attestation",
      "url": "https://unicorevetement.com/s/Unico_Attestationingenerie_UP1.pdf",
      "format": "pdf",
      "pageCount": 3,
      "sourceProductId": "u-p1",
      "projectApplicability": "to_confirm",
      "downloadMirrored": false
    },
    {
      "id": "unico-u-p1-order-form",
      "title": "U-P1 — Bon de commande",
      "kind": "order_form",
      "url": "https://unicorevetement.com/s/Prise-de-Commande-U-P1.pdf",
      "format": "pdf",
      "pageCount": 25,
      "sourceProductId": "u-p1",
      "downloadMirrored": false
    },
    {
      "id": "unico-resources",
      "title": "Centre de ressources Unico",
      "kind": "resource_index",
      "url": "https://unicorevetement.com/ressources",
      "format": "web"
    },
    {
      "id": "unico-colours",
      "title": "Sélection de couleurs et finis Unico",
      "kind": "color_reference",
      "url": "https://unicorevetement.com/couleurs",
      "format": "web",
      "completeChart": false
    }
  ],
  "pricing": {
    "schema": "mir-area-tariff-1",
    "id": "mir-unico-aluminium-in2-20261104",
    "amount": 3,
    "currency": "CAD",
    "unit": "in2",
    "unitLiteral": "pouce carré",
    "basis": "projected_outer_area_including_lips",
    "status": "configured",
    "scope": "aluminium",
    "productIds": [
      "unico-up1-aluminium"
    ],
    "sourceKind": "user_instruction",
    "sourceDate": "2026-11-04",
    "supplierPublishedPrice": false,
    "calculationEnabled": true,
    "customColorRequiresQuote": true,
    "excludedColorSelectionTypes": [
      "ral",
      "custom"
    ],
    "taxIncluded": null,
    "taxStatus": "not_calculated",
    "shippingStatus": "not_calculated",
    "note": "Tarif MIR confirmé à 3 $ CA par pouce carré. Surface en projection de la forme hors tout, lips compris; la projection C et les lèvres ne sont pas ajoutées une seconde fois. Toute couleur personnalisée ou RAL exige une soumission sans prix automatique. Disponibilité du fini à confirmer. Taxes et livraison non calculées."
  },
  "provenance": [
    {
      "id": "unico-product-page",
      "url": "https://unicorevetement.com/produits/u-p1",
      "kind": "official_product_page",
      "retrievedAt": "2026-11-04T03:01:02Z",
      "sha256": "ae537a90e4446db83287361566a817af4df4ed9810348b78baeae111fbc0fb8e"
    },
    {
      "id": "unico-colours-page",
      "url": "https://unicorevetement.com/couleurs",
      "kind": "official_colour_page_html",
      "retrievedAt": "2026-11-04T03:01:02Z",
      "sha256": "8add9cbf339f94d5b240f081f5b3899035a4d22cacafc816e2d23e6e5e8f52b5",
      "extraction": "Noms, codes, calibres, épaisseurs et style inline des cartes color-card. Les hex sont ceux du rendu web officiel.",
      "publishedSampleCount": 24,
      "completeChart": false
    },
    {
      "id": "unico-technical-pdf",
      "url": "https://unicorevetement.com/s/Unico_U-P1_FT.pdf",
      "kind": "official_technical_pdf",
      "retrievedAt": "2026-11-04T03:01:02Z",
      "sha256": "b4ebd8754f6c2d3a1f36da78239c820135c268a1b5a3875d714ed9ee97672560",
      "visuallyInspectedPage": 16,
      "pageIndex": 15,
      "conflictExamples": [
        {
          "printedInches": 118.188,
          "printedMillimetres": 3611.6,
          "actualConversionMillimetres": 3001.9752,
          "field": "width_max_18ga"
        },
        {
          "printedInches": 22.188,
          "printedMillimetres": 1173.2,
          "actualConversionMillimetres": 563.5752,
          "field": "height_max_18ga"
        },
        {
          "printedInches": 1,
          "printedMillimetres": 12.7,
          "actualConversionMillimetres": 25.4,
          "field": "joint_min"
        }
      ],
      "resolution": "Supplier clarification required; no automated dimensional hard limits created."
    },
    {
      "id": "unico-official-assets",
      "kind": "unchanged_official_images",
      "retrievedAt": "2026-11-04T03:01:02Z",
      "assets": [
        {
          "file": "assets/unico/u-p1.png",
          "sourceUrl": "https://unicorevetement.com/product-renders/transparent/u-p1.png",
          "bytes": 1749615,
          "contentType": "image/png",
          "sha256": "03b0a67b469c17724943d67b4378a8abcb3274d231d1c2f9a526e0251b2e65bf"
        },
        {
          "file": "assets/unico/frene.jpg",
          "sourceUrl": "https://unicorevetement.com/colors/textures/frene.jpg",
          "bytes": 435416,
          "contentType": "image/jpeg",
          "sha256": "746e071058a8a6f09103650e99c28a2e5e772d77826a60f170b47f65f6e6c156"
        },
        {
          "file": "assets/unico/caramel.jpg",
          "sourceUrl": "https://unicorevetement.com/colors/textures/caramel.jpg",
          "bytes": 381391,
          "contentType": "image/jpeg",
          "sha256": "ecf10de714dad2bcf05d0dd4a7f5e58bbda6f29f22daf5f4f8857becefbab171"
        },
        {
          "file": "assets/unico/sienne.jpg",
          "sourceUrl": "https://unicorevetement.com/colors/textures/sienne.jpg",
          "bytes": 274482,
          "contentType": "image/jpeg",
          "sha256": "887a7d82b5e11b13c64a166cb51faf5a175e45a21316bd3be8977da5624720dd"
        },
        {
          "file": "assets/unico/chene.jpg",
          "sourceUrl": "https://unicorevetement.com/colors/textures/chene.jpg",
          "bytes": 280537,
          "contentType": "image/jpeg",
          "sha256": "ef8a978a8e8332641027c3dec09c1eb662d320198c8c948575be04a209c3e25e"
        },
        {
          "file": "assets/unico/ecorce-grise.jpg",
          "sourceUrl": "https://unicorevetement.com/colors/textures/ecorce-grise.jpg",
          "bytes": 207811,
          "contentType": "image/jpeg",
          "sha256": "6351b851f13e3aaad5a769d533a597aba7f8873a6e14d9e3e4681712f2672eef"
        },
        {
          "file": "assets/unico/corten-acier.jpg",
          "sourceUrl": "https://unicorevetement.com/colors/textures/corten-acier.jpg",
          "bytes": 292685,
          "contentType": "image/jpeg",
          "sha256": "7bddad1ad2acda8ee50e504d48c5f6741ac964646c66bf467461da58f3f93cfb"
        }
      ]
    }
  ]
});
});
