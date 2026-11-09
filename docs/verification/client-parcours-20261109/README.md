# Recette client — révision du 9 novembre 2026

Base reproduite : **main `1b080b6e488e3008ec3a5c5f3e409636ce586653`**, qui contient les corrections publiées après l’audit `e11108a`. Instantané initial indépendant servi sur localhost:8792 ; version corrigée sur localhost:8793. Aucune donnée métier réelle créée et aucun courriel externe envoyé.

## Constats rejoués et résultats

| Parcours | Étapes et observation sur main actuel | Résultat livré / vérifié |
|---|---|---|
| L de trois points | Dessin → Mesures → Modifier le tracé → Mesures → rechargement, Chromium 390×844 et 1440×900, également 834×1112 et 1112×834 | Déjà corrigé. Points, cotes, angle corrigé à 105°, face et doubles plis gauche/droite conservés ; exports PDF/JSON réussis. Aucune réécriture du moteur. |
| Formulaire rapide | A=9½ po, B=3 po, finition Blanc 01, quantité 3, note QA-RAPIDE-PDF → configurateur → dossier → demande d’estimation → PDF | Données reprises ; une seule pièce après rechargement. Vérification visuelle du PDF réel : mesure, teinte, quantité et note présentes. [PDF](dossier-rapide-390.pdf) et [page rendue](dossier-rapide-page1.png). |
| Matériauthèque | Nuancier acier MAC dépourvu de documents → fiche → fermer → projet | Déjà corrigé : mention Aucun document, ouverture/fermeture sans exception. Choisir un autre matériau, ouvrir/fermer la bibliothèque et recharger conserve le choix. |
| Panneau seul | A/B renseignés, C et lips vides → ajout désactivé, sans indication immédiate au bouton | Le message nomme le premier champ bloquant et propose Aller au champ. Actions Pièce plate (C=0) et Sans repli (lips=0). Ajout réel au dossier réussi. |
| Mur complet | 120×96 po, 4×2, recouvrement 0, sans import | **8 panneaux**, avant toute demande de PDF. Reprise après rechargement vérifiée. Aide précise pour le recouvrement par joint et la pose bord à bord. |
| Menu du mur | Menu proposant Magasin employés/Bons de commande et des destinations atelier | Navigation client : dossier, panneaux, Studio, panier et estimation. Les destinations internes restent dans les composants de production/approvisionnement existants ; aucune autorisation serveur modifiée. |
| Recherche | panneau hardie/hardie panneau : 7 résultats ; hardie panneaux/panneaux hardie : seulement 3 | Les quatre formulations donnent désormais les mêmes **7 références**. Les autres recherches vis Kaycan et 458-264 passent. Aide vide adaptée : aucun filtre ou liste des filtres réellement actifs. [Relevé](search-results.json). |
| Panier | Passer à ma commande ouvre une vérification, sans commande transmise | Vérifier mon panier ; titre de page Mon panier. Le parcours d’estimation conserve Envoyer ma demande. Sélection, PDF et brouillon préservés. |
| Réalisations | Filtre conservé et focus rendu déjà corrigés ; une inspiration affichait 1 / 1 avec deux flèches | **1 sur 1**, flèches masquées/désactivées ; touches fléchées restent dans le filtre. Focus rendu à la carte. |
| Reprise locale | État du mur peu explicite après reprise | Projet repris · enregistré sur cet appareil ; confirmation locale du tracé/dossier après écriture réussie. Studio et brouillons d’estimation annoncent déjà la conservation locale. |
| Anciennes pages | studio.html est une démonstration générique ; dossier.html est un document historique, pas le dossier client | Pas de redirection ni de suppression du contenu. Liens explicites vers plan.html et selection.html#mir-unified-dossier. Aucun autre lien client actif vers ces anciennes pages trouvé dans les HTML/JS publics. |

## Matrice et preuves visuelles

[Matrice CSV](matrix.csv), détails [avant](before-matrix.json) et [après](after-matrix.json) : **15 pages × 6 largeurs**, avec états fermé, menu, focus, pied de page, champ bloquant, inspiration unique, fiche sans document et formulaire long/désactivé selon la page : **246 états par version**. Largeurs 360, 390, 760, 761, 834, 1440 ; hauteur 844 sauf 1440×900. Chromium avec tactile émulé jusqu’à 834, clavier réel (Tab/Échap), mouvement réduit, images décodées et `document.fonts.ready` attendus. Chaque ligne décrit liens, boutons actifs/désactivés, focus, images et débordement. Aucun débordement, image absente ou erreur JavaScript dans les deux matrices.

[Complément archives/recherche vide](archives-empty-matrix.json) : 36 états avant/après pour les deux anciennes pages et la recherche vide aux six largeurs. Les captures sélectionnées ci-dessous sont conservées dans le dépôt avec leurs [empreintes SHA-256](captures-manifest.json). [Complément confirmation locale](save-status.json) : quatre états du même L aux largeurs 390 et 1440. Le reste des captures exhaustives reste dans les artefacts locaux de recette ; les chemins de la matrice désignent ces fichiers.

| Anomalie / état reproductible | Page / largeur | Avant | Après |
|---|---|---|---|
| Estimation absente du menu ouvert | Boutique, 760, Menu | [avant](before/boutique-760-menu.png) | [après](after/boutique-760-menu.png) |
| Panier absent de la navigation visible au-dessus du seuil | Boutique, 761 et 1440, fermé | [761](before/boutique-761-ferme.png), [1440](before/boutique-1440-ferme.png) | [761](after/boutique-761-ferme.png), [1440](after/boutique-1440-ferme.png) |
| Pied de page manquant | Contact, 390, bas de page | [avant](before/contact-390-pied.png) | [après](after/contact-390-pied.png) |
| Logo et signature de pied de page masqués | Pliage, 390, formulaire rapide fermé | [avant](before/pliage-390-pied.png) | [après](after/pliage-390-pied.png) |
| Champ bloquant peu explicite et pas de raccourci pour 0 | Panneau, 390, A=24/B=36, C vide, inspecteur ouvert | [avant](before/panneau-390-champ-bloquant.png) | [après](after/panneau-390-champ-bloquant.png) |
| Destinations internes dans le menu client | Mur complet, 390, menu ouvert | [avant](before/mur-390-menu.png) | [après](after/mur-390-menu.png) |
| Flèches inutiles avec une seule inspiration | Réalisations, 390, une carte sauvegardée, filtre inspirations, modale | [avant](before/realisations-390-une-inspiration.png) | [après](after/realisations-390-une-inspiration.png) |
| Action de vérification nommée commande | Panier, 390, bas de page, sélection vide/désactivée | [avant](before/panier-390-pied.png) | [après](after/panier-390-pied.png) |
| Parcours client difficiles à retrouver dans le compte | MIR TEST connecté, 390, menu ouvert | [avant](before/compte-390-connecte-menu.png) | [après](after/compte-390-connecte-menu.png) |
| Aide vide indépendante des filtres | Boutique, 390, recherche inexistante, sans filtre puis Kaycan | [sans filtre](before/vide-390.png), [Kaycan](before/vide-filtre-390.png) | [sans filtre](after/vide-390.png), [Kaycan](after/vide-filtre-390.png) |
| Confirmation locale du tracé masquée | Pliage, 390 et 1440, exemple L puis Mesures | [390](before/trace-enregistre-390.png), [1440](before/trace-enregistre-1440.png) | [390](after/trace-enregistre-390.png), [1440](after/trace-enregistre-1440.png) |
| Anciennes pages ambiguës | Studio démo et référence, 390, ouverture | [démo](before/demo-390.png), [référence](before/reference-390.png) | [démo](after/demo-390.png), [référence](after/reference-390.png) |

L’accueil conserve ses ressources approuvées et son format sans pied de page ajouté. [Comparaison de tous les éléments visibles](home-layout-comparison.json) : mêmes coordonnées, dimensions et styles aux six largeurs. Les captures fermées du premier passage sont identiques sauf 23 pixels d’un niveau RGB à 390 (rastérisation) ; ne pas assimiler cela à une identité binaire de tous les PNG. Dans le menu mobile, le panier est nommé Mon panier. Les autres pages donnent accès au panier et à l’estimation des deux côtés de 760/761.

## Estimation : état réel

Les quatre entrées utilisent déjà le même module, la même API et la même fiche privée immuable. Aucun second service créé. Recette refaite : **8 tests serveur réussis**, HTTP et volume privé locaux réels, fournisseur capturé à `capture@example.invalid`. **12 parcours UI** (4 entrées × 390/834/1440) réussis : PDF originaux, échec/reprise, réponse interrompue/double clic sans doublon, refus privé sans autorisation et instantané inchangé après modification du Studio. [Détails de la recette existante](../estimations-20261109/README.md).

L’envoi de production reste **non raccordé**, `dist/mir-estimate-config.js` a `apiBase:''`. Aucune confirmation « Demande reçue » n’est fabriquée. Il manque un hôte Node HTTPS avec volume privé, Resend et un expéditeur vérifié, une destination de test réelle, les UUID organisation/adjointe autorisés, puis l’URL API publique. [Variables exactes et endroits de configuration](../../MIR_ESTIMATIONS_SERVER.md), [exemple serveur](../../../server/estimate.env.example). Réception dans une boîte externe et accès avec le vrai compte d’adjointe : bloqués par cette configuration. Après recette externe seulement, destinataire production `estimation@revetementsmir.com`.

## Compte réel, simulations et limites

[Compte client MIR TEST réellement authentifié](account-authenticated.json) : token, getUser et mir_account_snapshot ont répondu 200. Les fichiers locaux sont servis sous l’origine officielle interceptée ; cela ne démontre pas une connexion au site Pages publié. Commandes et adresses longues examinées aux six tailles, avant/après, sans enregistrement. Identité d’affichage remplacée avant capture par client.recette@example.invalid, sans retouche des pixels. Les accès privés de la fixture estimation utilisent séparément une authentification factice, jamais un contournement de production.

Les écrans nécessitant un jeton d’invitation, de validation de courriel ou de réinitialisation ne sont pas consommés. Aucun paiement, courriel réel ou compte créé. Aucun appareil physique. WebKit n’est pas installé dans cet environnement ; aucune réussite WebKit revendiquée.

## Mesures de chargement

[Avant modification](reproductions-before.json) : photos Boutique **2 812 655 + 1 417 463 = 4 230 118 octets**. [Après](performance-after-before.json) : **231 320 + 128 656 = 359 976 octets**, réduction **91,5 %**. Même photo, proportions conservées, originales intactes ; aucun changement d’image sur l’accueil. Mesures locales de ressources, pas un score Lighthouse ni une mesure réseau mobile réelle. Le relevé final désactive le cache navigateur ; les durées locales ne constituent pas des gains de latence mobile. La conversion applique l’orientation EXIF de l’original ([contrôle](image-orientation.json)) pour conserver la photo à l’endroit.

Scripts mesurés avant : Pliage d’entrée **6 / 168 040 octets** ; configurateur Pliage/Panneaux **44 / 1 076 475 octets** ; Mur complet **16 / 475 020 octets**. Déjà différés ; moteurs partagés conservés. Leur suppression ou chargement conditionnel n’est pas entrepris sans mesure CPU et preuve de non-régression des exports/anciens dossiers.

## Exécution reproductible

- `node tests/mir-client-followup-browser.cjs` : nouveaux parcours, 390/1440 ; produit le vrai PDF du formulaire rapide. `MIR_FOLLOWUP_BASE` permet de refaire la même recette sur Pages, avec données locales fictives et sans envoi.
- `MIR_BASE=http://localhost:8792 MIR_STAGE=before node tests/mir-client-followup-visual.cjs` ; puis `MIR_BASE=http://localhost:8793 MIR_STAGE=after ...`.
- `MIR_AUDIT_BASE=http://localhost:8793 node tests/mir-client-audit-20261109-browser.cjs` : L, angles, doubles plis, PDF/JSON, panier et bibliothèque, quatre tailles. [Résultats](pliage-results-chromium.json).
- `node --test tests/mir-estimate-service.cjs`, `node tests/mir-estimate-browser.cjs`.
- 121 commandes de syntaxe/contrôles statiques du workflow exécutées avec succès ; menu public 80/80. Régression mur→10 panneaux→PDF fournisseur (11 pages) et une feuille par panneau réussies à 390/1024/1440, avec Chromium local en remplacement du canal Chrome absent.

La première recette publiée a révélé une course dans le nouveau test de recherche (assertion exécutée avant initialisation du catalogue). Le test attend désormais les collections puis le résultat, sans délai arbitraire. Le déploiement et les tests sur les pages publiées sont suivis dans le workflow Pages. Le proxy local refuse le domaine GitHub Pages (CONNECT 403) ; la recette distante passe par le runner GitHub, sans interception des fichiers du site publié.
