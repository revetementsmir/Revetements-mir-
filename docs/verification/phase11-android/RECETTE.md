# Phase 11 — recette Android privée

Base intégrée : `9a76866006ecbb80d756d0d13948d55245ae552a`. Base initiale conservée dans l’historique : `a7d2d6fd10d6909d25f262aa06e921342c03d889`. Branche : `codex/phase-11-android-private`. [PR brouillon #31](https://github.com/revetementsmir/Revetements-mir-/pull/31).

## Provenance et résultats

Le workflow Android compile **la tête exacte de la PR**, vérifie l’APK et archive `source-sha.txt`, `pr-head-sha.txt`, `SHA256SUMS`, `result.json`, les journaux et les captures. `result.json` n’est produit qu’après réussite de tous les tests natifs, des deux étapes de mise à jour et de la matrice des rôles. Les numéros de runs et le verdict courant sont actualisés dans la description de la PR et dans Atelier; un ancien run vert ne certifie pas une nouvelle tête.

Aucune signature de livraison durable n’est disponible. L’APK est debug/TEST, identifiant `ca.revetementsmir.equipe.test`, version `0.11.0-test`. La CI installe `110001`, confirme une session Employé MIR TEST et prépare un témoin local, installe `110002` sans désinstaller, puis vérifie la conservation. Les comptes QA sont injectés après compilation dans un fichier privé de l’émulateur, supprimé après la matrice; jamais dans les APK ni leurs ressources.

## Audit et reprise

Passation Atelier 76 relue; branche et modifications locales conservées après la panne. Aucun projet Android recréé, aucun AGENTS.md applicable trouvé. Documentation consolidée, parcours, Auth, téléchargements, stockages et contrats serveur audités. L’environnement a connu un second redémarrage; branche, SHA et diff ont été revérifiés après son retour.

Les ressources nécessaires du portail suivi dans `dist` sont embarquées depuis le nouveau main; les pages publiques non autorisées sont exclues. L’inventaire initial de 997 fichiers décrit la base avant intégration de Responsive et de la séparation des environnements. Les maquettes Atelier candidates ne deviennent pas des parcours. Configurations TEST imposées; navigation limitée aux routes de `MirPolicy`. Moteurs, tarifs, catalogue, commandes historiques, PDF et migrations sont inchangés dans `dist` et `supabase`. Aucune migration Phase 11 nécessaire. Nouveau main intégré sans conflit : Responsive, annotations et séparation TEST/PRODUCTION sont conservés dans les sources web inchangées. Pages 43496784504 est entièrement réussi sur 9a76866006ecbb80d756d0d13948d55245ae552a; aucune publication Android effectuée.

## Contrôles locaux rejoués

- APK, instrumentation, tests Java et Android Lint : réussis; avertissements de versions et ressources générées conservés, aucun contrôle neutralisé.
- Adaptateur : 17 contrats, permissions simulées, Admin/client/inconnu refusés, purge intercomptes et transports bloqués.
- Compatibilité WebView : API standard `Promise.try`, Map et URL absentes recréées et testées dans un contexte isolé, sans transport ajouté. Le moteur PDF.js existant et ses octets restent inchangés; la compatibilité s’applique aussi au worker.
- Chromium : sept formats 360×780, 390×844, 768×1024, 834×1112, 1366×768, 1440×900, 1920×1080. Auth équipe, garde TEST, clair/sombre/système dynamique, texte Grand, contraste, hors ligne/retour, aucun débordement ni erreur JS.
- Lecteur : quatre vraies pages PDF avec contenu non vide, ouverture PDF et image privées, annulation d’enregistrement sans faux succès. Pont natif simulé ici; distinct des tests Android.
- Phase 10 : géométrie, gestion, cotation, sept formats, vingt rendus écran/PDF et PostgreSQL Boss/Adjointe 19/19.
- Non-régressions : Phase 6 contrats 7/7; Phase 7 notifications 15/15 et Dépenses PostgreSQL 10/10; Phase 8 client et PostgreSQL 13/13; Phase 9 catalogue; Dépenses 11; Absences 8; Entrepôt 15; dossiers communs 9 et chantier PostgreSQL 6; Punch et Clavardage SQL/guards; sessions Auth. Résultats stricts, sans .skip/.only/.todo, délai augmenté ou assertion supprimée.

## Recette physique préparée

Voir [SAMSUNG-S25-ULTRA.md](SAMSUNG-S25-ULTRA.md). Un raccourci Android « Tester ce téléphone », présent seulement dans le manifeste debug, ouvre quatre essais locaux explicites GPS/photo/QR/fichier. Aucune API métier ou Auth n’est chargée sur cette page; CSP connect-src none. Les résultats, coordonnées et octets ne sont pas stockés ni transmis; l’aperçu photo peut être retiré et disparaît à la fermeture. Un succès du pont simulé ou du test de raccourci n’est pas une validation des capteurs physiques.

## Recette Android exigée en CI

1. Activity et vraie WebView Android : origine embarquée, configuration TEST, connexion équipe, rotation/recréation, thème sombre, texte Grand, contraste et absence de débordement.
2. Coffre AES-GCM Android Keystore, absence du témoin en clair, déconnexion et purge.
3. Clavier réel, champ visible après redimensionnement, confirmation Retour et conservation de la saisie; arrière-plan/reprise, hors ligne et reconnexion.
4. Permission caméra refusée, puis accordée dans Android; scanner QR réellement ouvert puis annulé. Sélecteur de fichiers réellement ouvert puis annulé.
5. PDF Phase 10 de quatre pages rendu dans la WebView, contrôle des pixels de chaque page, sélecteur d’enregistrement ouvert puis annulé, original inchangé par SHA-256, faux PDF refusé.
6. Mise à jour `110001 → 110002` conservant le témoin local et la vraie session Employé confirmée côté serveur.
7. Raccourci de recette debug ouvrant la vraie WebView locale, sans formulaire métier ou client Auth.
8. Connexion réelle Employé, Chef, Entrepôt, Adjointe et Boss; rôle opérationnel relu, recréation de l’Activity et session persistée, autre organisation refusée, déconnexion et données masquées. Admin technique refusé comme rôle métier.

Les tests utilisent seulement des lectures métier MIR TEST; aucune commande, notification, estimation, transmission fournisseur, dépense ou absence de recette demandée. Les tests locaux de coffre et de fichier utilisent des témoins **sur l’émulateur uniquement**. Les workflows existants de rôles réels et Phase 6 restent actifs et leurs résultats sont rapportés séparément.

## Défauts trouvés et protections

### Correction après capture sur téléphone

Le test des alertes ajoutées a d’abord échoué sur le défaut réel : auth-error à 1,6057:1 en thème sombre. Les surfaces et couleurs des deux types de message sont maintenant accordées au thème; ce contrôle reste bloquant à 4,5:1.

Le formulaire réutilisé gardait un fond blanc alors que les libellés passaient en clair en mode sombre. `mobile/web/team.css` applique désormais les surfaces et couleurs Harmony ensemble; les tests mesurent un contraste minimal de 4,5:1 pour les libellés, champs, bouton et messages d’erreur/information, en clair/sombre/contraste renforcé sur les sept formats. Assertion de contraste également ajoutée dans la vraie WebView Android.

Application réservée aux cinq rôles métier de l’équipe : aucun compte client accepté. La connexion ne présente plus les liens, menu, panier ou pied de page du site public. Le pied de page commercial est retiré du HTML embarqué, et le bouton flottant public « Aide et soutien » est masqué; le Centre d’aide métier reste dans la navigation équipe. Les pages Boutique, Produit, Sélection, Pliage client et Studio client sont exclues de l’artefact Android et refusées par les politiques Java et JavaScript, même par URL directe. Le Magasin et le panier commun de l’employé demeurent dans le portail métier après connexion. Le site web public est inchangé.


- Paquet SDK historique `tools` indisponible : paquets SDK actuels explicités.
- Worker PDF résolu avec `vendor/pdfjs` en double : URL locale absolue et worker avec compatibilité WebView.
- API PDF.js `Promise.try` absente de la WebView AOSP : compatibilité standard épinglée, sans remplacer le moteur ni affaiblir ses tests.
- Après retrait du pied de page, une ancienne règle `body:has(#mir-harmony-header #portal-navigation)` annulait la marge basse et laissait le dernier champ dépasser d’une fraction de pixel. Marge native de 24 px prioritaire et suivi du déplacement du viewport ajoutés; cas fin de document testé sur sept formats, sans tolérance élargie.
- Champ sous le clavier : recalcul du défilement après changement du viewport, assertion géométrique conservée après stabilisation du layout.
- PDF volumineux dans l’état Capacitor : `TransactionTooLargeException`, Bundle de 4 497 732 octets. Octets retirés des options d’activité; seul le nom du fichier privé est conservé pour le retour du sélecteur. Le test conserve le vrai PDF de quatre pages.
- Pièces jointes ouvertes par `window.open` : raccordées au lecteur privé PDF/image; origine et session contrôlées. Ni URL signée ni document distant dans une WebView disposant du pont natif.
- Stockage Auth limité à sa clé fixe : le nettoyage des clés auxiliaires du SDK ne peut pas effacer le coffre, ni les PDF privés. Contrat dédié ajouté.
- Déconnexion : coffre, fichiers temporaires, stockage web, IndexedDB, historique et cache WebView purgés. Un IndexedDB bloqué interdit le changement de compte.

## Limites honnêtes

L’émulateur local sans KVM a démarré en 1 044 s puis 575 s et installé les APK, mais le système a montré « Quickstep isn’t responding » et des arrêts de processus. Ce n’est pas une recette Android locale réussie. Le runner CI avec KVM fournit les essais Android exploitables. Le téléchargement des captures CI vers cet exécuteur est refusé HTTP403 sur sdmntprcentralus.oaiusercontent.com. Les tests Responsive/annotations/séparation navigateur locaux attendent aussi l’accès atelier.atelier-app-001.workers.dev; ils sont ajoutés à la CI sur la nouvelle tête. elles restent dans les artefacts, sans prétendre les avoir inspectées localement.

Aucun téléphone physique testé. GPS ponctuel raccordé par le plugin officiel, mais position réelle, précision/délai, photo réelle, décodage d’un QR physique et sélection/téléversement d’une vraie pièce jointe dans un module métier restent à certifier sur appareil autorisé. Aucun suivi GPS permanent ou en arrière-plan. Les exports avancés CSV/JSON sont refusés explicitement dans l’enveloppe native actuelle; ils restent disponibles sur le site inchangé. Signature durable et procédure de distribution MIR à établir séparément. Aucun APK ne doit être distribué aux employés sans autorisation.

Production Supabase jamais consultée, aucun schéma serveur modifié, aucun courriel/push/paiement/fournisseur déclenché. PR brouillon uniquement; aucune fusion, publication ni phase suivante.
