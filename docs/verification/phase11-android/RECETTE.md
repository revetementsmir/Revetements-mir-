# Phase 11 — état de recette Android

Base vérifiée : `a7d2d6fd10d6909d25f262aa06e921342c03d889`.

## Reprise et audit

Passation Atelier version 76 relue. Terminal rétabli, branche existante retrouvée, statut et diff inspectés avant installation; modifications locales conservées. Aucun projet Android recréé. Aucun AGENTS.md applicable trouvé. Consolidé et feuille de route relus; cinq rôles métier, aucun Admin opérationnel.

Portail canonique : chantier.html, portail/client Auth, Entrepôt, Production et ressources existantes. Copie embarquée du graphe d’actifs publics suivi dans dist (997 fichiers avant exclusions/génération), avec configurations TEST uniquement. Les maquettes Atelier candidates ne sont pas embarquées comme parcours. Les pages natives accessibles sont listées explicitement dans MirPolicy; aucune page distante dans la WebView. Les moteurs, catalogues, instantanés et RPC serveur restent inchangés.

## Résultats locaux vérifiés

- `:app:assembleDebug`, `:app:assembleDebugAndroidTest`, `:app:testDebugUnitTest`, `:app:lintDebug` : compilation réussie. Lint sans erreur, avertissements de versions/ressources générées documentés; aucun contrôle neutralisé.
- Contrats adaptateur : 14/14, simulation isolée sans réseau : rôles relus, refus Admin/client/inconnu, transports refusés, purge compte, stockage natif, moteurs inchangés.
- Chromium : 7/7 formats 360×780, 390×844, 768×1024, 834×1112, 1366×768, 1440×900, 1920×1080. Auth équipe, hors ligne/retour, garde TEST, aucun débordement ni erreur JavaScript. Pont natif simulé, aucun compte réel utilisé.
- Contrats Phase 10 géométrie/gestion/cotation et sessions Auth rejoués sans échec.

## Android réel et MIR TEST

Résultats d’exécution de l’émulateur et de la CI à compléter après les runs. L’émulateur local AOSP API 35 sans KVM a mis 1 044 secondes à démarrer; installation d’un premier APK constatée par `pm path`, mais la commande d’installation a dépassé son délai et le service système package a redémarré. Cela ne constitue pas une certification du fonctionnement de l’application. Aucun résultat sur téléphone physique revendiqué.

Le workflow exige les tests Activity/WebView, coffre, PDF, caméra/annulations, mise à jour et cinq rôles MIR TEST + refus Admin. Les résultats seront enregistrés séparément des tests Chromium. Les comptes sont injectés uniquement au moment du test dans le stockage privé de l’émulateur; pas dans l’APK ni les captures de configuration. Aucune migration nécessaire, aucun nouvel événement métier ni donnée de recette serveur requis.

## Réserves avant livraison opérationnelle

CI Android, parcours réels de chacun des cinq rôles, GPS/QR/photo sur téléphone, réseau lent, clavier et confirmation d’abandon à certifier selon les preuves disponibles. Signature durable et chaîne de mise à jour MIR à établir séparément. APK debug identifié TEST; aucune distribution employés autorisée.

Aucun accès Supabase production, aucune migration serveur, aucune commande réelle, aucun courriel/push/paiement/transmission fournisseur. Aucune fusion, publication ou phase suivante.
