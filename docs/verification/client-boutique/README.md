# Boutique, fiche produit et panier client — recette

Base : `cca24dae6e093f638c1056127b87f3f1cf4f55b3` (main relu avant développement et avant livraison).
Branche : `feat/client-boutique-approved`. Cette phase est préparée pour révision ; aucune fusion ni publication.

[Galerie avant/après](gallery.html) · [Résultats automatisés](results.json) · [Exemple PDF natif](selection-390.pdf)

## Réalisation

- Boutique : recherche dans le premier écran, six catégories compactes avec les images existantes, filtres fabricant/famille/type conservés, photo MIR à droite sur tablette/PC, références réellement sélectionnables.
- Fiche : titre, échantillon fabricant, six teintes principales, nuancier complet, quantité/unité et ajout regroupés. Photos, caractéristiques, documents et fiche PDF restent disponibles dans « Détails techniques et documents ». Confirmation intégrée et accès direct au panier après ajout.
- Le retour aux résultats transporte uniquement des paramètres de filtres autorisés, jamais une URL de redirection fournie par le visiteur. Recherche et catégorie sont retrouvées.
- Panier : teinte, quantité et unité modifiables, retrait, état vide, PDF de sélection natif. L’estimation ouvre le contact existant `index.html#nous-joindre` ; le client joint son PDF. Aucun message envoyé automatiquement.
- « Dossier de projet » donne un accès distinct au composant existant, à ses pièces sur mesure et aux exports JSON/PDF complets. Aucun nouveau stockage de dossier. Les anciennes clés et les instantanés géométriques sont préservés.
- Le header Harmony est réutilisé avec une option limitée aux trois pages : « Mon panier » compte les lignes Boutique. Les autres pages gardent leur comportement.
- La page panier ne charge plus l’ancienne préparation de commande liée au compte : la commande et le paiement sont réservés à leur phase d’intégration. Le portail Mon compte et son moteur Auth ne sont pas modifiés.

## Recette exécutée

Chromium 155.0.8059.79, navigateur réel automatisé, fenêtres simulées : **390 × 844**, **834 × 1112**, **1348 × 926**. Tactile activé dans les contextes téléphone/tablette. Aucune revendication de test sur appareil physique ni sur Safari/iPadOS.

À chaque format : recherche « HardiePlank » ; filtres accessibles ; catégorie Fibrociment ; retour aux résultats avec recherche/catégorie conservée ; HardiePlank Select Cedarmill, Pierre des champs, 2 pi² ; nuancier complet et documents ; ajout/confirmation/compteur ; modification teinte/quantité/unité puis reprise après rechargement ; visite Mon compte et retour navigateur ; estimation via contact existant ; téléchargement d’un vrai PDF ; accès au dossier et export JSON complet ; retrait et panier vide. Absence d’erreurs JavaScript et de débordement horizontal contrôlée sur les captures.

Le stockage brut du dossier sur mesure reste identique pendant les opérations du panier. Le JSON complet retrouve le même instantané de la pièce existante et le matériau avec sa teinte et sa quantité. Les exports ne modifient pas le panier.

**Accueil avant/après : captures intégrales identiques octet par octet aux trois formats**, après chargement des images différées. Les empreintes SHA-256 sont dans `results.json`. Les requêtes externes sont bloquées de manière identique pour cette comparaison locale déterministe.

Régressions exécutées :

- `mir-selection-pdf-browser.cjs` : JSON et PDF réels sur 390 et 1440 px.
- `mir-unified-dossier-browser.cjs` : dossier matériaux + moulure, PDF complet, JSON, reprise, projets différents et anciennes listes, sur 390 et 1440 px.
- `mir-client-header-browser.cjs` : 30 contrôles de menu sur les pages publiques, téléphone/tablette/PC.
- `mir-production-client-flow-browser.cjs` : menu client, isolation admin et parcours natif dessin → dossier → JSON/PDF → reprise, sur 390 et 1440 px.
- `mir-account-browser.cjs` : transport Auth simulé, connexion/erreur/adresses/déconnexion sur sept largeurs, confirmation/retour panier, récupération/liens expirés/Google/invitations. Aucune modification du portail ; ceci ne constitue pas un essai OAuth réel.
- Contrats : en-têtes, Signature, accueil, sélection PDF, nouvelles matières, compte/session/configuration, liens partagés, accès portail, régressions Pages, atelier et longueurs de pliage.

Les adaptations des tests existants concernent les libellés approuvés, l’ouverture explicite du dossier désormais replié et le retour Auth vers le panier invité. Les assertions sur les exports, les données et les permissions restent en place.

## Inspection et limites

Captures des trois pages et des états ajout/vide inspectées ; PDF rendu et inspecté : une ligne, Pierre des champs, **2 pi²**, document de préparation à confirmer. Les espacements des cartes et l’alignement quantité/unité sur téléphone ont été corrigés pendant la recette. La confirmation d’ajout apparaît dans la fiche avec « Voir mon panier » sans message flottant qui la recouvre.

Aucun bug bloquant connu dans le périmètre testé. Le panier reste local au navigateur comme avant. Aucun paiement, création de commande réelle, envoi d’estimation, changement Supabase ou essai Google réel dans cette phase. Vérification manuelle sur téléphone et tablette physiques recommandée avant publication.

Les sources de l’accueil, Pliage, Réalisations, Studio 3D, portail employé/Mon compte, Entrepôt et moteurs de calcul/PDF ne sont pas modifiées. La révision visuelle du propriétaire reste attendue avant toute fusion/publication.
