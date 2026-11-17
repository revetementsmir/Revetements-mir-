# Parcours client MIR — site TEST

## Demande confirmée

Frederick a approuvé la disposition du parcours présenté et demandé sa publication sur le site TEST le 17 novembre 2026. Navigation en haut, aucune barre de navigation inférieure. Au moins six profils visibles par page. Toutes les cotes et tous les angles du modèle sur un écran, repères communs au dessin et aux champs, fractions de pouce acceptées. Angles initiaux conservés, modification limitée à la pièce et restauration possible. Étape « Matériau et couleur » explicite. Seules les listes Boutique et Réalisations défilent; les autres pages utilisent sections ou pagination.

## Sources et périmètre

- Dépôt : revetementsmir/Revetements-mir-.
- Base relue : a2235c50466b0a21fecb7b1be8216dfd5006829c.
- Branche isolée : codex/client-parcours-test-20261117.
- Cible : Vercel Preview, projet mir-studio-test, sans cible production.
- Modèles, catalogue, paniers et géométrie réelle sont conservés. L’ancien formulaire avancé, le Studio complet et les comptes connectés nécessitent une recette distincte s’ils ne sont pas couverts par le rapport navigateur.
- Photos et logo originaux conservés. Aucune écriture Supabase, aucun envoi réel, aucun changement d’accès ni fusion Studio PR44.

## Réalisation

Navigation mobile : logo, Menu, panier, compte. Langue dans le menu. Liens accessibles sur ordinateur. Footer avec le logo original et « Votre maison. Les bons matériaux. Les bons détails. ».

Pliage : quatre étapes (profil; toutes mesures/angles; matériau/couleur/face; quantité/récapitulatif). Pagination de six modèles, grille 2×3 téléphone et 3×2 tablette/ordinateur. Contrôles de mesure compactés, contraste explicite, angles et replis conservés selon la convention du moteur. La nouvelle géométrie appartient à une révision de pièce, pas au modèle partagé.

Les pages Accueil, Maison, Chantiers, Contact, Aide, Produit, Panier et Estimation reçoivent des sections/paginations de présentation qui réutilisent les nœuds et événements existants. Aucun overflow:hidden global n’est utilisé pour simuler un écran complet. La recette mesure aussi le débordement et le contenu coupé.

## Vérifications réellement exécutées avant CI

- Syntaxe des scripts modifiés : réussie pendant l’intégration.
- 6 contrôles de géométrie pliages : réussis (aimantation, sens, retours écrasés, clic/toucher).
- 14 contrôles Phase10 : réussis (dix modèles, fractions, quantités, face, snapshots, règle du J, documents et permissions métier).
- Recette navigateur et captures : à exécuter sur le SHA du candidat avec le workflow dédié. Ne pas assimiler les contrôles précédents à une approbation visuelle.
- Déploiement : non exécuté à la rédaction initiale. Compléter avec reçu READY, manifeste de révision et URL réellement vérifiés.

## Limites de recette

Aucun appareil physique n’est certifié. Le navigateur local ne démarre pas dans cet environnement; la CI utilise Chromium. L’aperçu protégé conserve les gardes existantes : API externes, connexion et envois désactivés; panier et exports locaux disponibles. Les tests historiques qui exigent une barre basse sont obsolètes pour la nouvelle demande et ne constituent pas une validation de cette navigation.
