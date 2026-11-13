# Phase 11 — inspection réelle du 13 novembre 2026

Phase non terminée. PR #31 reste en brouillon. Aucun appareil physique certifié.

## Provenance
ZIP téléchargé avec succès après autorisation du domaine, extrait dans /tmp/mir-visual-inspect.
SHA-256 : a88a00359e593de27e88089ea849d2c9f4025b3c05041e201716bd6f39536063.
Les 27 PNG ont chacun été ouverts avec view_image; leurs empreintes correspondent au manifeste.
Captures : https://github.com/revetementsmir/Revetements-mir-/actions/runs/43513719511/artifacts/14080296300
Générateur b0e243c37fa75ebdfb55856da6874cab953301ce; génération échouée à employee-login (collision de nom), pas une génération complète.
16 vues UIAutomator : APK exact 110002, source 58c13ab96be63601d314ba94d92ab7dd20976407.
11 vues certified-original : instrumentation 110001, binaire non archivé; jamais présentées comme captures 110002.

## Constats observés (avant correctif)
- certified-apk-team-signin.png : logo, titre, champs courriel/mot de passe, case et bouton lisibles; aucun footer commercial ni bouton public flottant visible.
- employee/chef/warehouse/assistant/boss-home.png : rôle et bannière TEST visibles; contenu lisible, retours à la ligne des longs identifiants; aucun débordement horizontal évident. La vue Employé coupe le bouton Punch au bord inférieur de la capture : la capture seule ne prouve pas son accessibilité après défilement.
- Les cinq *-menu.png : ÉCHEC du périmètre privé. Studio 3D et estimation visibles; Chef, Entrepôt, Adjointe et Boss montrent aussi Réalisations/Nous joindre et autres liens publics. Menu Entrepôt long et tronqué en bas. Ce défaut invalide la certification visuelle des menus de l’APK original.
- Les cinq *-settings.png : formulaires lisibles en clair, options sans chevauchement; portions inférieures hors capture. Chef affiche Chargement… : fin du chargement non prouvée.
- android-signin-portrait.png : état Vérification de votre compte…, pas formulaire stable.
- android-signin-landscape.png : sombre lisible dans la partie visible, formulaire coupé sous Mot de passe; défilement non prouvé visuellement.
- android-dark-large-contrast.png : rendu clair, pas preuve de thème sombre ni de texte Grand/contraste effectifs.
- android-keyboard.png : champs visibles et clavier ouvert; bouton Me connecter partiellement recouvert. Le défilement/dernier champ métier reste à observer.
- android-offline.png : bandeau hors ligne et note locale visibles, sans chevauchement dans cette vue.
- android-pdf-four-pages.png : lecteur sombre, contrôles visibles, première page rendue avec schéma et cotes; seulement une page visible, zoom/lecture des quatre pages non prouvés par cette image.
- android-pdf-save-chooser.png : écran blanc, sélecteur non observé.
- android-device-recipe.png : écran blanc, diagnostic local non observé.
- android-qr-scanner.png : connexion, scanner non observé.
- android-camera-denied.png : connexion; aucune erreur de refus visible. permission-before-check.png : dialogue Android caméra visible et lisible (langue système anglaise).

## Correctif en cours de recertification
La CSS native ne l’emportait pas sur la règle !important du menu Harmony; les raccourcis data-client-shortcuts n’étaient pas couverts. Règle native ciblée sur le menu déplacé et filtrage des liens hors routes privées après insertion. Aucun fichier dist/supabase modifié, aucun moteur Responsive commun recopié.
Test de régression : échec reproduit avant correction (employee studio menu), puis réussite sur sept formats et cinq états de rôle simulés, avec Centre d’aide métier et pliage interne conservés. Cette simulation ne remplace pas une capture Android.

## CI connue et limites
Tête 65be2e65e3ae919689d71f13cb1cd2c50234da85 : Android 43514512242, Rôles 43514511234, Phase6 43514511341 et fondation 43514511319 réussis. Captures 43514511239 échouées avant connexion initiale (aucun champ exposé); pas de formulaire Employé ni confirmation retour.
Toute tête après le correctif doit être recertifiée séparément, avec nouvel APK/empreinte et inspection des menus corrigés. L’APK original 0.11.0-test/110002/SHA256 141eae844d4e938c6270dcf243536e7f72b1b45b68206922d7584cc61a5e2127 reste une preuve historique, pas la livraison du correctif.
Restent : capture formulaire Employé sans sauvegarde, retour Android, thèmes réels, paysage/clavier, diagnostic local, scanner et sélecteur PDF; recette Samsung physique complète. Aucune soumission métier ni préférence serveur changée.

## Complément après le premier essai du correctif
Run43516240067 / d90fd61 : compilation/Java/Lint et Chromium verts; six tests natifs et mise à jour verts; matrice interrompue sur la note locale vide après annulation du retour. Artefact14081310881 téléchargé. Sept images supplémentaires ouvertes : menu Employé encore capturé sur une ancienne frame de connexion, note sur formulaire sans texte visible, confirmation Android lisible, sombre/Grand encore clair, diagnostic local effectivement rendu, sélecteur PDF Android effectivement rendu, scanner natif visible sur caméra synthétique émulateur (pas un test QR physique).
La simple attente du DOM et postVisualStateCallback n’établissait pas la présentation à l’écran; ajout d’une attente des frames d’affichage, sans augmenter les délais existants. Chargement des réglages attendu avant de quitter ce scénario.
Protection native de la saisie locale d’absence : le portail actualise le compte toutes les15secondes et recrée les formulaires. Les champs modifiés sont gardés en mémoire pour le même acteur et la même vue, effacés au changement de compte/vue, reset ou submit. Aucun stockage serveur/localStorage ni envoi ajouté. Test Chromium de remplacement du formulaire et d’isolation intercompte vert sur sept formats. L’assertion native de conservation après annulation reste stricte.
Accès au Centre d’aide métier conservé par un bouton du menu interne connecté, réutilisant le centre et les permissions existants; bouton flottant public toujours masqué. Le test emploie désormais cet accès réel.
Le générateur UIAutomator séparé reste épinglé à l’APK ORIGINAL58c13ab/141eae84… : même lancé depuis une nouvelle tête, il ne certifie jamais le correctif. Son échec de scénario doit rester explicite. Les captures v110002-* des tests de la nouvelle CI appartiennent au nouvel APK de leur run; vérifier source et empreinte avant usage.
