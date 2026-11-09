# Estimations — intégration et recette

Base : main `e11108a980cefe8dff7e8509b79b4b414afe580b`, contrôlée par fetch le9novembre2026. Les correctifs Pliage locaux de la séance interrompue sont conservés. Les anciennes preuves restent historiques.

## Parcours livré

Le bouton Estimation ouvre `estimation.html` dans le même site. Le formulaire est commun aux entrées général, Studio, panier et pliage. Il conserve coordonnées, adresse, note et fichiers dans IndexedDB. Les plans sont facultatifs dans le formulaire général. Les limites affichées viennent de `/api/estimates/config` ; sans service raccordé, les champs et le brouillon restent utilisables, l’envoi reste désactivé et son absence de raccordement est explicite.

Le panier et le pliage réutilisent `MIRPDF.makePlan`, `MIRUnifiedClientDossier.pdfOptions` et `MIRProduction.productionPages`. Leur PDF réel et leur sélection sont transmis avec les coordonnées par la même API. Aucun lien mailto d’estimation.

Le Studio capture les données et les vues des quatre façades, les ouvertures avec positions et dimensions connues, les finitions et les moulures. Les quantités sont « Métré préliminaire à valider ». Le bardeau et les couleurs de portes/fenêtres sont séparés dans « Aperçu seulement » ; leurs apparences restent dans la3D. Les moulures autour des ouvertures restent « À estimer ». Les PDF d’origine déjà importés sont repris depuis le stockage du projet. Une réponse interrompue conserve le même UUID et les mêmes octets ; la fiche reçue est indépendante des changements ultérieurs du Studio.

`estimation-dossier.html` ne contient aucune donnée client dans son HTML public. Fiche, PDF et JSON3D exigent chacun une autorisation serveur : Admin MIR vérifié ou adjointe explicitement autorisée. Le lien seul ne permet pas l’accès. Les SVG sont affichés comme images ; la3D utilise le renderer existant sur la version soumise.

## Vérifications

- `node --test tests/mir-estimate-service.cjs` :8contrôles serveur, HTTP local et volume privé réels. Prestataire capturé sur localhost, adresse `capture@example.invalid`. Aucun courriel externe.
- `node tests/mir-estimate-browser.cjs` : serveur statique et service de recette créés par le test ; parcours UI avec données fictives. Voir `browser-results.json` pour les formats effectivement terminés.
- Import du PDF fictif via la vraie interface du Studio, reprise du fichier original, ouverture ajoutée dans l’interface, vues privées et version soumise immuable vérifiés par cette suite.
- `tests/mir-client-audit-details-browser.cjs` : reprise Pliage, historique sans doublon, saisie clavier, documentation LightTrim et unités ADSEAL préservés. Chromium390×844,834×1112,1440×900.
- Lot visuel : [rapport et paires avant/après](../estimation-visual-20261109/README.md). Les tailles sont émulées ; aucun appareil physique.

La destination, l’authentification factice du service local et les interceptions du SDK sont propres à la fixture de test. L’Auth réelle MIR TEST des écrans Mon compte est vérifiée séparément dans le rapport visuel ; ne pas confondre ces preuves. La réception dans une boîte externe et un serveur de production ne sont pas établis par les tests localhost.

## Activation encore nécessaire

Voir [service et configuration](../../MIR_ESTIMATIONS_SERVER.md) et [variables serveur](../../../server/estimate.env.example). Il faut un hôte Node HTTPS avec volume privé persistant, Resend et un expéditeur vérifié, une vraie boîte de recette, les droits d’adjointe, puis l’URL API dans `dist/mir-estimate-config.js`. Les secrets restent dans le gestionnaire de secrets de cet hôte, jamais dans GitHub Pages. Passer ensuite la destination à `estimation@revetementsmir.com` après la recette externe.

GitHub Pages publie le frontend uniquement. Aucun faux service ni ressource payante n’a été créé pour masquer la configuration manquante. Au dernier contrôle de cette séance, le proxy de l’environnement refusait `https://revetementsmirweb.github.io/MIR/` : `curl: (56) CONNECT tunnel failed, response 403`. Le contrôle du déploiement et celui du site servi doivent être distingués dans la livraison finale.
