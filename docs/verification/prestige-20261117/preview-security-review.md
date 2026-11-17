# Revue indépendante de l’aperçu TEST — 17 novembre 2026

Résultat : **11 vérifications réussies sur 11**, sur le build local servi à `http://127.0.0.1:8768/test/`. Aucun accès externe ni requête d’écriture n’a atteint le filet de sécurité réseau du navigateur. Preuve détaillée : `preview-security-results.json`; recette reproductible : `node tests/mir-prestige-preview-security.cjs` après construction et démarrage du serveur local.

Le build de présentation a été corrigé dans `scripts/build-prestige-preview.cjs` pour fermer trois écarts constatés : CSP hérité autorisant encore des ressources distantes; template Studio public ajouté sans CSP; interception des soumissions utilisant des identifiants différents des vrais formulaires. La recette a ensuite repéré les HTML sans balise `<head>` explicite; leur injection est désormais couverte aussi.

Les 53 HTML générés portent maintenant leur CSP strict et la garde de prévisualisation, avant les autres scripts. Les appels fetch/XHR sont limités aux lectures dans le dossier TEST, les sockets et beacons sont coupés, les soumissions sensibles sont arrêtées avant leurs gestionnaires métier et les liens sortants sont désactivés. Les téléchargements locaux restent disponibles. Ces changements existent uniquement dans l’aperçu généré et ne reconfigurent pas les comptes ni les services.

Le compte affiche « Aperçu TEST : connexion et envois désactivés. » et son équivalent anglais. Aucune session réelle n’a été créée. L’exclusion des paramètres et marqueurs d’invitation, ainsi que le retour à la présentation interne pour un rôle staff, ont été vérifiés avec une fixture de présentation isolée, sans charger l’authentification. Les routes internes de production ont également conservé leur présentation d’origine.

La navigation reste dans `/test/`, conserve `recette=1` et utilise le stockage préfixé TEST. Le panier fonctionne sous la garde : ajout réel local d’un matériau du catalogue, puis de deux pliages construits avec une fixture locale de profil; les quantités 2 et 3 et le compteur commun de trois lignes sont conservés. Les exports PDF et JSON par URL Blob restent téléchargeables. Le template Studio public et l’interface Studio TEST restent distincts.

Limites : Chromium local seulement; aucun test de connexion, invitation, courriel, paiement, Google ou estimation serveur réel. Le moteur PDF→3D n’a été ni modifié ni recertifié. Le CSP sur réponses de workers est défini dans `vercel.json`; son application HTTP doit être vérifiée sur le déploiement d’aperçu, car le serveur Python local ne lit pas cette configuration.
