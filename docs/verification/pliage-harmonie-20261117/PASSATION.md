# Passation MIR — 17 novembre 2026

## Reprendre ici, sans recommencer

Dépôt : `revetementsmir/Revetements-mir-`. Copie : `/workspace/mir-prestige`. Branche : `codex/pliage-harmonie-20261117`, créée depuis `3573d90f064e95459c18a8b6ba8a4462bfaa1dc0` (branche précédente `codex/client-prestige-20261117`). Le lot est réalisé et testé localement. Sources et agents gelés. Le nouvel aperçu hébergé reste à déployer et vérifier; ne pas confondre un ancien aperçu avec ce lot.

Le dernier message demande une passation, faute de tokens. Nouvelle demande expressément autorisée, **pas encore réalisée** : détourer les photos produit pour supprimer leurs fonds blancs jugés laids. Conserver exactement les produits, étiquettes, proportions et couleurs; utiliser une vraie transparence PNG/WebP et un fond de carte cohérent. Ne pas simplement appliquer un mélange de couleurs qui altérerait le produit. La photo de maison de l'accueil doit rester intacte. Pour les retouches d'image, suivre les outils disponibles et leurs instructions (image_gen avec transparence et référence locale inspectée); ne pas présenter une reconstitution comme la photographie originale.

## Instructions utilisateur qui restent valables

- Continuer directement, sans redemander les choix déjà approuvés.
- Prestige simple, anthracite chaud / pierre / champagne; maison conservée. Responsive PC, tablette, téléphone.
- TEST seulement : aucune production, écriture Supabase, demande/commande réelle, courriel, paiement ou activation Google.
- Préserver les autres worktrees et les travaux du Studio PDF→3D, notamment la mission/PR44 séparée. Ne pas fusionner ou écraser leur code.
- Ne pas refaire les interfaces Boss, Adjointe, Entrepôt/Livraison ou Chef d'équipe. Le dernier lot autorise les parcours pliage et magasin employé.
- Français par défaut, choix de langue persistant; ne pas annoncer tout le site bilingue certifié.
- Livrer des écrans et un aperçu navigable, pas seulement des explications.

## Ce qui vient d'être réalisé

1. **Géométrie et confirmation du pliage** : aimant 45°/90° calculé avant l'arrondi de grille, angles relatifs au côté précédent; petit rebord tracé en premier reconnu comme retour écrasé. Un vrai `mode: hem` est distingué d'un angle signé proche de180° et de deux angles consécutifs. Correction du clic transmis par la carte au bouton radio : la carte entière du choix de repli fonctionne; protection contre les clics résiduels du dessin conservée.
2. **Parcours client et employé** : quantité/matériau/couleur explicites avant panier; brouillons et cotes par profil conservés; refus de stockage expliqué; nouvelles pièces, banque, retour, modification et révision fonctionnels. Le client revient à `selection.html`, le contexte chantier employé reste conservé. Champs sans débordement dans l'iframe; dialogue final au-dessus de la barre mobile; onglet Pliages actif également dans la barre préexistante.
3. **Échantillons** : Äkta306, Bluhouss307 et Bosco rectangulaires dans boutique, fiches, nuances et magasin. Sources réelles et cadrages documentés, même grain entre couleurs. Bluhouss est explicitement un détail recadré de l'aperçu fabricant, pas une nouvelle photo plane. Catalogue/prix/formats inchangés. Nouveau adaptateur `mir-store-siding-previews.js` pour le magasin; cadre de la revue magasin3:2.
4. **PDF** : textes/références longs conservés, en-têtes de continuation corrigés, quantité comptée une seule fois, documents harmonisés anthracite/champagne. Couleur longue et perforation panneau lisibles. Géométrie de fabrication préservée; microcorrectif de libellé anglais hem dans `production-model.js`.

## Preuves et limites — ne pas les embellir

Tout est dans `docs/verification/pliage-harmonie-20261117/` : README général, `integration-summary.json`, sous-dossiers `geometry/`, `journey/`, `samples/`, `pdf/`, rapports, captures, harnais et empreintes.

- Géométrie : 162 cas navigateur,18 confirmations répétées client/employé aux3formats;6 tests purs géométrie et6 garde-clic. Les confirmations finales utilisent de vrais contacts sur les SVG de carte et les boutons.
- Parcours :6 parcours complets client/employé à1440/834/390; choix invalides refusés, aller-retour,2pièces, modification, révision, panier, données PDF et FR/EN. Dialogue final contrôlé à1440×1050,834×1112,360×780,844×390,780×360.12 régressions employé passent.
- Échantillons :22 profils/375 associations de couleur,18 scénarios magasin,60 captures. Source/grain/nœuds/masques stables et catalogue inchangé.
- PDF :8 exports/24pages,60 contrôles;49 contrôles supplémentaires sur les en-têtes extrêmes; vrai téléchargement panier FR/EN.4 SVG employé strictement identiques avant/après.
- Aperçu construit : `tests/mir-pliage-harmonie-preview-browser.cjs` **PASS15 cas**,10 fichiers PDF téléchargeables (8 usuels +2 extrêmes), zéro erreur JS. Refus réseau vérifié avec les deux protections (`TEST_ENDPOINT_DENIED`, `PREVIEW_EXTERNAL_REQUEST_DISABLED`).
- L'ancien test client de mise en page n'est **pas** annoncé passant : écarts de coordonnées de0,9–1,2px reproduits sur la base, puis ancien contrat « tout sur un écran » incompatible avec la composition actuelle. Journaux et copies des harnais dans `journey/harnesses/`; nouveaux parcours fonctionnels vérifiés séparément.
- Chromium simulé, pas d'appareil physique ni d'impression papier. Cadence tactile documentée :400ms entre fin du dessin et nouveau contact, contact70ms. Des contacts quasi instantanés peuvent ne générer aucun click natif Chromium; aucune garantie sur les gestes très rapides d'un appareil réel.
- Aucun envoi réel ou écriture distante exécuté.

## Photo de scie-cloche et catalogue antérieur

L'utilisateur a renvoyé sa photo jaune de scie-cloche, marquée3⅝po/92mm. Elle est visible dans la conversation mais **aucun original téléchargeable, Sediment ID ou chemin de fichier n'est exposé**. Dernière recherche : seul ancien Texte collé.txt dans `/workspace/attachments`; aucune photo originale nouvelle. Ne pas dire qu'elle a été intégrée et ne pas inventer un identifiant. L'utilisateur l'a déjà renvoyée plusieurs fois : éviter de lui demander encore la même chose sans nouvelle piste.

Préserver les131 matériaux du catalogue canonique `dist/catalogue-fd6866b49d21.json`. DEWALT ELITE :15 diamètres documentés2–5po, formats par diamètre, sans prix/stock inventé. LEILUO HCS44mm : référence et compatibilité encore limitées à la photo. MAC :1½po confirmé, boîte500, réf. détaillant1790291. PRIME20031 et HardieColorPlus déjà présents. Photos manquantes DEWALT/LEILUO restent signalées; ne pas élargir leurs exceptions commerciales.

## Fichiers à connaître

- Géométrie/étapes : `dist/production-app.js`, `mir-profile-recognition.js`.
- Formulaire/viewport : `pliage.html`, `pliage.js`, `mir-client-pliage.css`, `mir-client-pliage-viewport.js`, `production.html`, nouveau `mir-pliage-journey.css`.
- Échantillons : `commerce.js`, `material-preview.js`, `mir-client-siding-previews.js`, nouveau `mir-store-siding-previews.js`, `chantier-app.js/html`, `magasin-revue.js/html`.
- PDF : `mir-selection-pdf.js`, `mir-dossier-pdf.js`, `mir-panel-po-pdf.js`, `annotated-pdf.js`, libellé uniquement dans `production-model.js`.
- Traductions/navigation : `mir-client-en-ca.js`, `mir-prestige.js`.
- Galerie : `scripts/export-pliage-harmonie-preview.cjs` → `dist/pliage-harmonie-20261117.html` et son répertoire de captures. Dernier export265 entrées; le manifeste distingue avant/après,3formats et PDF.

## Suite concrète

1. Lire cette passation et les rapports; vérifier `git status`, branche et dernier commit. Préserver les modifications restantes. Ne pas refaire les audits rouges/verts déjà documentés.
2. Traiter le nouveau détourage des photos disponibles : inventaire des vrais fichiers, suppression du fond seulement, vérification des objets blancs/étiquettes et des contours, transparence et rendu uniforme dans boutique/panier/magasin. Photo d'accueil exclue. Le détourage reste entièrement à faire.
3. Refaire seulement les contrôles concernés par ces nouvelles images, puis régénérer la galerie et construire l'aperçu avec `node scripts/build-prestige-preview.cjs`.
4. Attention : ce build modifie uniquement la date de `docs/verification/prestige-20261117/gallery-manifest.json`; restaurer ce changement parasite si c'est encore le seul écart.
5. Commit/push branche TEST; déployer le SHA exact; vérifier manifeste, protections, liens, images/PDF et donner le lien à l'utilisateur. Aucun déploiement de ce nouveau lot n'est encore confirmé au moment de cette passation.

Vercel existant : projet `prj_u52jhK8wezpzFlHy5VBxVOJRh4Lt` (`mir-studio-test`), team `team_iAvmCeq2FbaeeMzbfOK79EAL`, GitHub repoId1453181341. SSO actif sur tous les déploiements, à conserver. Création avec `gitSource:{type:'github',repoId:1453181341,ref:SHA_EXACT}`, buildCommand `node scripts/build-prestige-preview.cjs`, installCommand vide, outputDirectory `.prestige-preview`, nodeVersion24.x, **sans target production**. Vérifier READY, sourceSHA puis `/test/mir-test-environment.json` (TEST `hxtztkmbfpmzrieccwsg`, révision exacte), galerie `/test/pliage-harmonie-20261117.html`. Utiliser le connecteur Vercel pour les URL protégées; ne pas afficher les jetons de partage.

L'ancien lien `https://mir-studio-test-brwixe5rn-desk17.vercel.app` est le lot outils antérieur, **pas** cette nouvelle correction.

## BOSS / MOON

MOON1.3.11 réellement consulté, BOSS **GOD MODE explicitement choisi par l'utilisateur** : ne pas redemander le niveau. Méthodes métier, ergonomie, harmonisation, qualité et portée SEO consultées;4 agents locaux ont réellement travaillé, avec revue indépendante. Aucun dispatch autonome Atelier revendiqué.

Projet Atelier `7afd893e-adcb-494b-a82b-c4cf8b28f94e`. Missions de ce lot (dernière version connue2, active; relire avant mise à jour) :
- Métier/géométrie `aad2c5d0-dd94-43cd-ad33-44aea5f39e09`.
- UX `ae1c1d98-743f-4ada-9b95-28b35e42058c`.
- Harmonisation `b5c95993-abff-4e6f-844d-fade08027d2f`.
- PDF/qualité `30c6201c-b9d3-4e29-8d50-fb1a935e880e`.

Mettre à jour les missions avec commit/aperçu réels après livraison. Le helper officiel d'upload visuel Atelier répondHTTP403, vérifié dans `atelier-upload-helper.json`; aucune capture n'y a été transférée. Ne pas prétendre la proposition visuelle publiée et ne pas contourner cette restriction. Les captures sont livrables dans Git et l'aperçu protégé.
