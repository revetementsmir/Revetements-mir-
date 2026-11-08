# MIR — Harmony et édition directe

Développement dans le dépôt existant `revetementsmirweb/MIR`, PR [#52](https://github.com/revetementsmirweb/MIR/pull/52). Base vérifiée : `f1389767f3d5a0ae9f6f935dc6da7968a57d6a70`. Code de cette recette : `56f4d8d03a7d82d0781bfc6affb5a9ca3d9d010a`.

## Réalisé

- En-tête partagé : logo original, section, dossier avec compteur et menu. Même hauteur et alignement sur les écrans concernés. Six destinations admin réutilisent les vrais boutons et leurs gestionnaires. Aucun rôle n'est créé à partir d'un paramètre d'URL. Les pages client gardent leurs accès publics; le portail réutilise les seules entrées que son contrôleur autorise.
- Pages : atelier/Pliage, Panneaux, Mes pliages, Boutique admin, Magasin employés admin, Bons, boutique publique, pliage public, calepinage, sélection/dossier client, entrepôt et portail. Le menu métier du portail rejoint le menu commun sur mobile; la barre latérale reste sur grand écran.
- `mir-harmony.js` et `mir-harmony.css` centralisent l'en-tête, ses tokens, contrôles, focus, fermeture par Échap/clic extérieur et présentation des fiches de saisie. Le second menu mobile du traceur n'est plus initialisé dans Harmony. Les styles publics historiques restent nécessaires aux autres pages.
- A et B ont leurs lignes de cote sous et à droite du panneau. Toucher leur valeur, ou C — Projection, ouvre une fiche compacte. Pouces, millimètres, fractions classiques et Unicode sont interprétés par `MIRProduction.parseMeasurement`.
- Chaque côté réel ouvre sa fiche : lip indépendant, sans lip, angle géométrique défini par la forme, bas après pose et perforation du bas. Les étiquettes n'affichent que les noms des côtés. Les contours intérieur/extérieur proviennent de `MIRProductionVolume.buildMesh`.
- Les finitions et métaux importés restent conservés lors de la correction de cotes, même lorsque la couleur n’existe pas dans le nuancier local. Seule une modification explicite du métal ou de la couleur libère cette conservation. Le défaut a été reproduit par un test en échec, puis corrigé. Les valeurs originales sont contrôlées après révision.
- Validation sur une copie avant application. Les géométries impossibles conservent la valeur précédente. Le changement d'un carré annonce explicitement qu'A et B évoluent ensemble. Une cote liée à une pente X/12 renvoie au formulaire de pente plutôt que de déplacer silencieusement le point dérivé.
- Accès clavier sur les cotes et côtés; méthode de saisie alternative repliable avec boutons de 44 px. Les champs originaux restent disponibles. Les zones de cote mobiles sont agrandies.
- L'aperçu d'une pièce du dossier permet aussi d'ouvrir directement la bonne cote ou le bon côté. Une application actualise le dessin; l'enregistrement d'une nouvelle révision dans le dossier reste explicite. Neuf autres pièces et le mur source restent intacts.
- Parcours Panneaux : Choisir → Dessiner et mesurer → Vérifier → Commander. Les dix repères et l'exclusion d'une pièce du bon sans suppression sont conservés.

## Préservé

Aucun changement dans `production-model.js`, `production-volume.js`, les moteurs de calepinage, `mir-panel-po-pdf.js`, `mir-po-workflow.js`, Supabase, les migrations, le logo, les contacts fournisseurs ni les commandes existantes. Aucune transmission fournisseur, invitation ou activation de service. Les conversions gardent la précision de calcul; le formatage et les choix de précision MIR existants sont conservés.

Le PDF PR #50 est réutilisé : dix pièces, dix lignes, couverture + dix fiches, un dessin principal par pièce. Le PDF joint contient réellement un lip de 2¼ po et un autre de 0 sur P01; il ne change ni les dimensions ni les quantités durant l'export.

## Recette exécutée

| Contrôle | Résultat et preuve |
| --- | --- |
| A/B/C sur rectangle, unités/fractions, rejet de 0 et valeurs non finies | `mir-harmony-direct-browser.cjs` : 360×800, 390×844, 428×926, 768×1024, 1024×768, 1440×900, 1920×1080, 844×390 |
| Noms de côtés et absence de chevauchement | Test navigateur des boîtes des étiquettes contre contour/cotes et inspection des captures téléphone, tablette, PC et triangle |
| Lèvres 2¼ / 0, 2D/3D | Données du modèle vérifiées, rendu 3D changé, autres lèvres conservées |
| Révision et reprise | `mir-harmony-revisions-browser.cjs` : ouverture depuis la fiche, saisie 1250 mm, sauvegarde explicite, rechargement; neuf autres pièces identiques |
| Triangle rectangle | Trois côtés seulement, Pente, lèvres indépendantes, saisie clavier et rejet `1/0` |
| Mur 5×2 et bon | `mir-wall-panel-po-browser.cjs` et `mir-panel-one-sheet-browser.cjs` : dix repères, dix références uniques, exclusion persistée, brouillon, aucune duplication après rechargement |
| PDF réel | [Exemple de 11 pages](MIR-Harmony-10-panneaux.pdf), signature `%PDF-`, mesures des lèvres vérifiées; [page extraite](pdf-panel-example.png) inspectée |
| Pliage tactile et paysage | `mir-atelier-v4-browser.cjs`, `mir-admin-guided-browser.cjs`, `mir-drawing-pan-browser.cjs` : tracé, zoom, déplacement, surface paysage >120 px, ancien dossier 8 pi et révision préservés |
| Bons existants | `mir-purchase-orders-browser.cjs` : 1440/1024/390, PDF réel, révision, recherche, envoi désactivé |
| Catalogue et magasin | `mir-pliage-audit-browser.cjs` : prix, publication locale explicite, retrait, séparation magasin/boutique, fournisseurs |
| Client | `mir-production-client-flow-browser.cjs` : menus 360/390/820/1440/2560/3440, dessin → dossier → soumission → JSON/PDF réels → reprise |
| Menus publics et sauvegardes | `mir-public-menu-browser.cjs` : 42 parcours; `mir-client-header-browser.cjs`, `mir-workshop-reset-browser.cjs` |
| PR #51 | Source `670ded9b7f7e3ee087290f1be2bd3ee5953f4872`; combinaison locale avec cette branche sans conflit, recette employé réussie à 320/360/390/820/1024/1440. La PR #51 n'est pas fusionnée par ce travail. |

Les tests historiques ont été adaptés au bouton réellement visible du nouveau menu. Leurs vérifications métier (données, tarifs, export, historique) restent présentes. Le test des anciens textes « Lip » sur le croquis vérifie désormais le nom du côté et la valeur du lip dans le vrai modèle, conformément au mandat.

## Captures comparables

Les captures `before-*` viennent du code main intact servi séparément. Les `after-*` viennent de cette branche. Données de panneau identiques : 48×36 po, C=2 po, lip commun=1 po. Aucun plan client ni compte réel.

| Écran | Téléphone 390 | Tablette 1024 | PC 1440 |
| --- | --- | --- | --- |
| Panneau | [Avant](before-panel-390.png) · [Après](after-panel-390.png) | [Avant](before-panel-1024.png) · [Après](after-panel-1024.png) | [Avant](before-panel-1440.png) · [Après](after-panel-1440.png) |
| Atelier/Panneaux | [Avant](before-admin-390.png) · [Après](after-admin-390.png) | [Avant](before-admin-1024.png) · [Après](after-admin-1024.png) | [Avant](before-admin-1440.png) · [Après](after-admin-1440.png) |
| Boutique | [Avant](before-shop-390.png) · [Après](after-shop-390.png) | [Avant](before-shop-1024.png) · [Après](after-shop-1024.png) | [Avant](before-shop-1440.png) · [Après](after-shop-1440.png) |
| Mur | [Avant](before-wall-390.png) · [Après](after-wall-390.png) | [Avant](before-wall-1024.png) · [Après](after-wall-1024.png) | [Avant](before-wall-1440.png) · [Après](after-wall-1440.png) |
| Portail fermé | [Avant](before-employee-390.png) · [Après](after-employee-390.png) | [Avant](before-employee-1024.png) · [Après](after-employee-1024.png) | [Avant](before-employee-1440.png) · [Après](after-employee-1440.png) |

[Triangle réel dans le navigateur](triangle-390.png) · [séquence de recette](sequence-recette.mp4). La vidéo est un montage chronologique de captures réelles Playwright à 8 images/s, pas une prise en temps réel ni une simulation d'appareil physique. Une trace interactive est également produite par la CI dans `artifacts/harmony/revisions-trace.zip`.

## Limites et publication

- Android et iPad sont des formats simulés sous Chromium Linux. Aucun appareil physique, Safari, clavier système iOS ou installation PWA n'a été testé.
- Les parcours métier employé de compatibilité utilisent le fixture de la PR #51; ce n'est pas une commande réelle ni une validation de Supabase en production.
- L'entrepôt conserve son authentification et ses droits existants. Aucun accès d'entrepôt n'est inventé dans un menu en l'absence d'un droit vérifié.
- Les cotes dérivées X/12 et les valeurs verrouillées renvoient à leur contrôle d'origine. Aucun second solveur n'est ajouté.
- Transfert des captures dans Atelier non confirmé : le helper officiel `agent-upload.mjs` a répondu HTTP 403. Les preuves sont livrées ici dans le dépôt; cette limite ne concerne pas le code du site.
- La PR reste soumise à tous les contrôles GitHub. Un état de publication doit être confirmé par le workflow Pages et un contrôle de la révision réellement servie; les tests locaux seuls ne constituent pas un déploiement.

## SEO/GEO et protections

Périmètre public affecté : navigation de `boutique.html`, `pliage.html` et `selection.html`; liens HTML initiaux préservés sans JavaScript. Outils/portail : `production.html`, `calepinage.html`, `chantier.html`, `entrepot.html`. URL, contenus commerciaux, robots/noindex, authentification et rôles restent inchangés. Aucun contenu de dossier n'est rendu public pour l'indexation. Pas de revendication de classement, d'indexation ou de citation IA.
