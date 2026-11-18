# Pliage 03 — inventaire et contrats à préserver

Audit local du 18 novembre 2026. Base : `e58964cd8937766d2457904d2d7d625d1bc7df5e` ; branche de travail dédiée `codex/pliage-03-etapes-gauche-20261118`. Aucun fetch, appel backend, écriture Supabase ou envoi effectué. Les constats ci-dessous viennent de la lecture du code et des suivis ; ils ne constituent pas une recette navigateur du nouveau lot.

## Parcours réellement présents

| Origine | Destination et contrat |
| --- | --- |
| `pliage.html` | `production.html?mode=client&kind=profile` |
| Formulaire rapide | Même route avec `quick=<id>` ; pièce conservée dans `mir-bending-v1` jusqu'à conversion réussie |
| Carte de modèle | `production.html?mode=client&template=<id>` ; `kind=profile` peut être absent |
| Profil lié | `production.html?mode=client&kind=profile&profile=<id>` |
| Panier commun | `production.html?mode=client&kind=profile#production-order`, puis bouton `data-edit-piece` |
| Produit Unico | Route `mode=client&material=unico-up1-*` : panneau, à exclure du nouveau parcours profils |

Les quatre étapes du configurateur existent déjà dans `production-app.js` : forme, mesures et angles, matériau/couleur/face, quantité et récapitulatif. Les contrôles sont déplacés par le contrôleur natif : conserver IDs, délégations, validation et mémoire de brouillon. `#production-order:target` conditionne la visibilité du dossier ; le retour en édition doit réellement changer le fragment.

`mode=client` n'est pas une frontière suffisante : `source=store` désigne aussi le magasin employé. L'iframe chantier peut réutiliser le wizard via `MIRFieldDrawingContext` et `fieldPersonal`. Les nouvelles couches publiques doivent exclure ces contextes, les panneaux et les routes atelier. Le paramètre de canal ne constitue pas une authentification.

## Géométrie, faces et quantité

- `MIRProduction.buildProfile()` accepte les angles intérieurs, rotations signées et replis écrasés 180°. Les décimales et la virgule décimale sont acceptées. Le repli ne doit pas être confondu avec une rotation ordinaire presque égale à 180°.
- Le vrai wizard affiche déjà un champ `step="any"` par pli. `editableClientBends()` transforme le template standard en tracé `custom` avant une modification ; `clientModelAngles` conserve les angles source pour rétablissement.
- `coloredFace={side:'left'|'right',segmentId}` est défini dans les coordonnées physiques, en suivant les lettres des segments. Le rendu prend en compte le sens de projection. Actuellement il dessine une étoile ou un trait court sur un segment ; la face continue est une évolution de présentation, pas un changement de ce contrat.
- Le formulaire rapide `pliage.js` garde son contrat historique de 90° et l'annonce dans ses exports. Il ne faut pas lui ajouter des angles sans reprendre ce contrat explicitement.
- Une nouvelle pièce client commence avec `quantity:''`. L'ajout exige un entier strictement positif. La réédition conserve la quantité existante.
- Longueur vendue : 120 po, sauf J à soffite 144 po ; `MIRBendingLengths.check()` préserve les longueurs historiques déjà enregistrées.
- Préserver les règles des profils MIR : somme des cotes de 8 po lorsque requise, clouage Sill Trim, dérogations J explicites, replis et verrous de mesures. Une somme de segments n'est pas le développé industriel après compensation des plis.

## Persistance et réédition

| Objet | Contrat |
| --- | --- |
| Matériaux client | `mir-shopping-list-v1` |
| Pièces client | `mir_production_client_dossier_v1`, enveloppe `{version:1,order}` |
| Pièce | `id`, `kind`, `spec`, `snapshot`, `history`, `selection`, métadonnées source |
| Instantané | `schema:'mir-production-instance-1'`, modèle source, géométrie, angles, face, valeurs, révision et `drawingSVG` |
| Dossier d'estimation pliage | `selection:{schema:'mir-bending-estimate-1',order}` |
| API disponible | `MIRProductionWorkspace.getEstimationDossier()` ; événement `mir-production-ready` |

`reviseInstance()` conserve l'historique des modifications de valeurs. `reviseProfileTrace()` crée une révision de géométrie privée, garde le même ID de pièce et empile l'instantané précédent. Ne pas remplacer ces chemins par une écriture directe dans le panier.

Le compteur public lit le nombre de lignes matériaux + pièces dans les deux clés existantes, et non la somme de leurs quantités. `mir_unified_order_cart_v1` est un autre miroir partagé : il ne remplace pas les sources du panier public.

`MIRProductionWorkspace.editOrderItem()` est réservé aux contextes non clients. La réédition publique doit emprunter le bouton natif `data-edit-piece` ou une extension explicitement limitée, pas cette API atelier.

Les anciens pliages rapides ne sont pas exclus silencieusement : leur présence bloque le dossier commun jusqu'à reprise dans le configurateur. Aucun changement de version ni migration de stockage n'est requis pour afficher une face continue.

## Chaîne d'affichage et PDF

1. `production-app.js:1387` reconstruit la miniature publique avec `diagramSVG()`. Une amélioration commune du rendu client couvrira l'aperçu et ces miniatures.
2. `selection.html` / `mir-unified-client-dossier.js` affichent actuellement les pièces sous forme de lignes textuelles, avec lien vers le dossier de production. Aucune miniature de pliage n'y appelle `snapshot.drawingSVG`.
3. `MIRProduction.productionPages()` reconstruit le modèle à partir de l'instantané/spec fourni. Il ne recopie pas `snapshot.drawingSVG` dans le PDF.
4. Les appels client se trouvent dans `production-app.js:1729` (export), `mir-estimate.js:23` (demande depuis pliage) et `mir-unified-client-dossier.js:96` (dossier combiné). Ils passent `document:'client-request'`.
5. Le rendu interne `clientDossierPages()` est aussi utilisé par certains documents de production. Sa seule identité de fonction ne prouve donc pas le contexte public. Tout nouveau branchement doit être explicitement demandé uniquement depuis le client public.
6. Les pages PDF principales contiennent un dessin ; les pages de continuation conservent les notes et avertissements sans répéter quantité ni dessin. Ne pas jeter ces pages ni reconstruire leurs textes.

Le helper en préparation par `client_tools`, `MIRPliageSurfaces.surfacePaths(points, options)`, reçoit des points déjà projetés et peut recevoir la section native `M.profileSectionPath(points,bends)`. Il produit les chemins gauche/droite et diagnostics, sans état métier.

**Intégration autorisée puis réalisée :** `productionPages(input,{document:'client-request',profileSurfaceRenderer})` accepte un callback `(model,mapped,section) => annotationSVG`. La section est celle de `profileSectionPath`, commune au dessin visible et au repère. `profileDiagramContent` accepte cette section en option ; sans option, son comportement reste identique. `mir-pliage-documents.js` adapte le helper et refuse les routes employés, privées et embarquées. Le callback ne remplace l'étoile que s'il retourne une annotation non vide. Les appels du panier et de l'estimation pliage le transmettent explicitement. Root prend le chargement et l'export de `production.html` ; `selection.html` charge les deux helpers. Les pages privées affichant des fichiers déjà soumis ne régénèrent pas de dessin : aucun script inutile n'y est ajouté.

Les instantanés historiques, y compris leur SVG d'origine, doivent rester immuables. La nouvelle face visible se calcule à partir de la même géométrie et du même `coloredFace`, sans réécriture silencieuse d'anciennes demandes ou pièces.

## Nuanciers réels disponibles

Comptage local du catalogue après `MIRBendingFinishes.catalogue()` ; aucune disponibilité commerciale nouvelle n'est déduite.

| Référence | Noms de teintes | Swatches locaux référencés |
| --- | ---: | ---: |
| Royal AlumiPro régulier | 20 | 0 |
| Royal AlumiPro robuste | 38 | 0 |
| Royal AlumiPro gaufré | 19 | 0 |
| Royal Cedar Renditions | 15 | 0 |
| Kaycan Urbanix 0747 | 13 | 13 |
| Kaycan 0721 | 41 | 29 |
| Gentek 3037 | 48 | 45 |
| Vicwest acier | 59 | 12, plus 36 valeurs hex |
| MAC acier | 25 | 15 |

Conserver les codes, noms fabricants, sources et réserves de disponibilité. Kaycan 0721 et certaines références Gentek élargissent le choix à des références dont la disponibilité sur le rouleau exact n'est pas vérifiée. MAC indique aussi une confirmation de rouleau/calibre/fini. Les couleurs sans image ni hex ne doivent pas recevoir de teinte inventée. Un échantillon numérique reste indicatif.

## Fichiers et travaux à protéger

Moteurs et données : `production-model.js`, `production-volume.js`, `mir-bending-presets.js`, `mir-bending-lengths.js`, `mir-bending-finishes.js`, catalogue commun, tarification, transferts de profils, snapshot/history. Les adaptateurs de présentation publique peuvent évoluer sans toucher les valeurs du modèle.

Ne pas modifier les interfaces employés, l'atelier, les panneaux ni les moteurs Studio/PDF→3D. Le worktree `/workspace/Revetements-mir-pr31` possède des travaux employés/Android non committés. `/workspace/mir-prestige` reste à `bb39e14`, plus ancien que cette base : il manque des évolutions de `production-app.js`. Les autres worktrees vérifiés étaient propres au début de l'audit.

Aucun `AGENTS.md` trouvé sous `/workspace`. Suivis lus : `docs/verification/pliage-harmonie-20261117/README.md`, `PASSATION.md`, `geometry/README.md`, `journey/README.md`, `client-pliage/README.md`. Le détourage d'images produit a été annulé dans la passation : conserver les originaux. Aucun fetch effectué ; les références distantes locales ne certifient pas l'état actuel du serveur.

## Recette attendue

- Angles différents et décimaux, conservation après rechargement, ajout, réédition et PDF ; replis 180° préservés.
- Deux faces continues réellement opposées sur L, Z, profil concave et replis, sans changer cotes ni nombre de segments.
- Quantité vide/zéro/fractionnaire refusée ; ajout entier et réédition sans duplication, compteur cohérent.
- Même couleur, source et réserve dans le récapitulatif, le panier et les documents.
- Notes longues et continuations PDF conservées ; sortie employés identique hors opt-in public.
- FR/EN, clavier, trois formats ; anciennes sauvegardes lisibles ; aucun envoi réel.

Tests existants utiles : `mir-pliage-harmonie-geometry.cjs`, `mir-pliage-harmonie-geometry-browser.cjs`, `mir-pliage-harmonie-journey-browser.cjs`, `mir-production-client-flow-browser.cjs`, `mir-bending-lengths.cjs`. Ils n'ont pas été exécutés pour ce rapport de lecture.


## Vérification locale de l’intégration documents

Commandes exécutées, sans réseau ni navigateur :

```sh
node tests/mir-pliage03-documents.cjs
node tests/mir-unified-dossier.cjs
node tests/mir-phase10-bending.cjs
node --check dist/production-model.js
node --check dist/mir-pliage-documents.js
node --check dist/mir-estimate.js
node --check dist/mir-unified-client-dossier.js
```

Résultats : **10/10 nouveaux groupes**, **9/9 contrats du dossier commun**, **14/14 contrôles historiques Phase 10**, syntaxe JavaScript valide. Les 24 empreintes de modèles et sorties sans opt-in correspondent exactement à la base `e58964c` : cinq fixtures couvrent L, angles décimaux différents, repli écrasé, profil concave et panneau. Les empreintes ont été calculées à partir du fichier historique lu par `git show` et sont stockées dans `tests/fixtures/mir-pliage03-legacy-render-hashes.json` ; aucun accès réseau n’est nécessaire au test.

Les nouveaux tests vérifient les côtés physiques opposés, une seule ligne continue par repère, les arcs de repli, l’identité de la section utilisée, les textes/cotes/métadonnées, les notes longues et continuations, l’immuabilité des instantanés, la réédition avec conservation de 112,5°/67,25°, le panier combiné et le contexte réel `bending` avec un générateur de fichier local simulé. L’export employé ignore le callback même si un appelant le fournit. La recette visuelle finale et les PDF effectivement ouverts sont coordonnés par root/QA ; ces contrôles purs ne les remplacent pas.

La seule légende technique modifiée dans une sortie opt-in est « Face colorée : Face 1/2 — côté indiqué par le liseré bleu », qui remplace la référence obsolète à l’étoile. Les tests autorisent exactement cette substitution ; les autres textes, notes client et métadonnées restent comparés à leur source. Le dictionnaire anglais dédié est chargé avant le module de langue partagé dans le panier.


### Convention des angles du PDF client

Le rendu client opt-in affiche maintenant les angles intérieurs comme le formulaire et le dessin : pour une rotation signée, `180 - abs(angle)` ; un angle intérieur existant et un repli écrasé ne sont pas convertis. Cette option est appliquée uniquement lors de la création des lignes techniques du nouveau document client. Elle ne recherche ni ne remplace du texte dans les noms, les notes ou les données enregistrées.

Le neuvième groupe teste les rotations −30° → intérieur 150°, ±90° → 90°, −30,125° → 149,875°, l’égalité géométrique entre rotation −30° et intérieur 150° à droite, la conservation du sens et des instantanés, ainsi qu’un nom et une note contenant littéralement « Pli A–B = 30° ». Sans opt-in et dans les documents employés, les 24 empreintes de la base restent identiques.


### Produit et référence dans les documents

Le document client opt-in imprime désormais le nom et la référence produit réellement présents dans `spec.material` au sein des détails paginés. Aucun nom, code fabricant, stock ou prix n’est inventé. Les préfixes « Produit : » / « Référence produit : » deviennent « Product: » / « Product reference: » avant le découpage en anglais ; les valeurs restent celles de la source. Les notes sont ajoutées séparément, après cette traduction technique. Le dixième groupe couvre un nom de produit très long, les continuations sans troncature, les deux langues et une note ressemblant aux libellés techniques.

La chaîne d’export native a aussi été exécutée dans Chromium, avec deux pièces fictives locales, puis le PDF téléchargé a été lu et rendu par PyMuPDF. Les références produit, les codes couleur, les quantités et les angles intérieurs sont présents et les liserés sont continus sur des faces opposées. Voir [la preuve PDF réelle](pdf/README.md). Les sorties sans opt-in gardent leurs 24 empreintes historiques.
