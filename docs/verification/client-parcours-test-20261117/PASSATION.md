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

## Recette initiale et corrections

Le run GitHub Actions 44157826668 a exécuté Chromium 145 sur le SHA 3fc1f19ae4cb10bb080c8d185233412c529630f6 : 7 cas réussis, 73 cas arrêtés. Les résultats ne constituent pas une validation visuelle. Les causes démontrées ont été corrigées : sections Produit non initialisées, masquage Accueil, réserve CSS de barre basse, placement du badge TEST et langue ajoutée tardivement au compte. Les cas d’évitement et antispam sont exclus uniquement quand ils sont volontairement hors écran; les bandes de Boutique/Réalisations doivent être accessibles par défilement réel.

Treize groupes ciblés des vraies fonctions du moteur passent maintenant, dont les modèles canoniques, les fractions, les snapshots, la règle du J et la modification d’angle avant saisie de la première cote. Les petits diagrammes mobiles utilisent les points du modèle réel et des repères lisibles. La seconde recette doit confirmer les nouvelles pages Matériaux/Pliage et les correctifs de disposition. Les modules compte/Studio restent à intégrer et vérifier.

## Seconde recette et candidat suivant

Le run 44160040269 a exécuté le SHA defd20b4c8ed76be6e010c39720a97dc831f9d61 : 50 cas réussis, 30 cas arrêtés. Le parcours réel cotes → angles → finition → quantité → panier et le commerce ont réussi à 834 × 1112. Les nouveaux défauts observés sont les sections longues de Produit/Panier/Matériaux, la finition sur les écrans courts et certains profils à plusieurs côtés. Les pages Compte et Studio n’avaient pas encore leurs modules de présentation dans ce SHA.

Le candidat suivant intègre ces modules sans changer leurs moteurs : commandes Compte/Studio placées en haut, formulaires réels conservés, panneaux répartis dans des pages accessibles. La finition regroupe fabricant et couleur, conserve les détails techniques dans une vue explicite « Options de la pièce » et affiche la face peinte sur la géométrie réelle. La recette Studio attend désormais le moteur et le rendu, pas seulement le chargement HTML.

## Troisième recette et publication TEST

Le run 44163074589 porte sur 2e604fa54e3e55e24cfc2472b680a7df05e41ac7 : 66 cas réussis, 14 cas en échec, 273 captures et 614 diagnostics. Le parcours complet de pliage — mesures, angles, matériau, couleur, face peinte, quantité et ajout avec instantané au panier local — réussit aux quatre dimensions 320 × 640, 390 × 844, 834 × 1112 et 1440 × 900. À 320, le contrôle échoue ensuite sur la présentation du panier. Les 16 profils ont été parcourus à 320 et 834; seul le profil à sept côtés dépasse encore de 26 px à 320. Compte, inscription, Boutique et Réalisations passent les contrôles couverts.

Ce SHA est réellement publié en Preview READY sur https://mir-studio-test-2axuomkmk-desk17.vercel.app/test/index.html (déploiement dpl_GBYZkg2dA4xLihhVRcnBfpXWWDvQ). Le manifeste HTTP 200 annonce exactement cette révision; le HTML et la feuille de style servie correspondent au candidat. La protection Vercel demeure active; le lien temporaire de consultation est transmis séparément à Frederick.

Le candidat suivant traite uniquement les défauts mesurés : marges du profil à sept côtés sur écran court, sections Produit/Panier/Matériaux/Pliage historique et commandes du Studio. Agrandir et zoom partagent une rangée; Terrain et Marches restent accessibles dans Affichage et rotation avec leurs vrais nœuds et événements. Le calcul des pages de zones réserve la hauteur réelle de chaque rangée et du titre commun. La recette suivante doit confirmer ces corrections; ce paragraphe ne constitue pas une déclaration de réussite du prochain run.
