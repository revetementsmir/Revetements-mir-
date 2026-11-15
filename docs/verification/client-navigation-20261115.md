# MIR — Parcours client, navigation maquette 2 et préparation FR-CA / EN-CA

**Date de reprise :** 15 novembre 2026 UTC. **État :** PR brouillon exclusivement, aucune publication ni fusion.  
**Source de branche :** `codex/refonte-chantier-employe-chef` (PR37 ouverte/brouillon), SHA vérifié `4d63be9a3afbabfc4e9211bdf026457c1e91dc52`. PR39 Magasin fusionnée dans PR37 via merge commit `d4c343a8cbb6d5f06f148ed2bfb01fbb9799a4c8`; PR36 et PR37 non fusionnées vers main.  
**Branche du lot :** `codex/client-navigation-maquette2-20261115` ; fichiers métier et base des PR existantes inchangés.

## Matrice : décisions approuvées → existant → intervention → preuve attendue

| Décision enregistrée | Source existante examinée | Intervention ciblée | Contrôle |
| --- | --- | --- | --- |
| Accueil **maquette 2**, photographie existante intacte | `dist/index.html`, `dist/mir-home-premium.css`, `assets/mir-home-hero-20261105.webp` et AVIF ; trois cartes images `mir-home-card-{revetement,pliage,studio}-20261105.webp` | Aucune régénération, remplacement, distorsion ou retouche d'assets ; conserver les CTA et les 3 cartes | Tests accueil originaux, photo décodée dans Chrome et affichage `object-fit` sans déformation |
| Header léger, avatar rond **Connexion** tout à droite | `dist/mir-public-menu.js/.css` : un lien `Compte` rectangulaire ajouté au header | Avatar SVG accessible `aria-label=Connexion` sur la même URL sécurisée `chantier.html?view=account` ; aucun rôle imposé côté UI ; focus visible | Chrome : 360/390/430/768/834/1024/1440, position à droite, un seul avatar dans l'en-tête |
| Un seul accès Connexion dans la navigation affichée | Ancienne barre basse : `Compte` en plus du `Compte` en tête | Supprimer **seulement ce doublon d'entrée** de la barre basse et conserver l'accès par avatar ; la barre remplace ce raccourci par **Studio** | Sur autres pages : aucune entrée `Compte` en bas ; avatar présent et 5 destinations stables |
| Aucun rail inférieur sur l'accueil, quel que soit l'appareil | Contrôleur commun créait `.mir-mobile-tabs` sur toutes les pages, y compris `index` | Ne plus instancier le rail sur `index`, annuler l'espace inférieur uniquement sur l'accueil | Rail absent sur index 360–1440 ; accueil sans défilement sur formats standards |
| Barre mobile/tablette stable sur autres pages | `MIRPublicMenu` mobile jusqu'à 1100 px ; liens `Accueil/Boutique/Pliage/Commandes/Compte` | Conserver rail et `Accueil/Boutique/Pliage/Commandes`, y ajouter `Studio` au lieu du doublon Compte | Barre présente 360–1024 sauf accueil, absente sur PC 1440, destinations réellement navigables |
| PC sans barre inférieure | `.mir-mobile-tabs` déjà cachée hors `max-width:1100px` | Aucune nouvelle barre de navigation PC, conserver les liens existants en en-tête | Navigation haute disponible au clavier et sans débordement à 1440 px |
| Compte authentifié et retour au travail client | `dist/mir-client-return.js` reconnaît déjà `return=studio` / `return=panier` ; `portal-client.js` vérifie le rôle côté serveur | Avatar sur `plan.html` ou `selection.html` conserve ces contextes. Aucune autorisation ou redirection métier client modifiée | URL retour en contexte (test), panier et données invité non vidés, portail décide selon identité réelle |
| Toutes les pages clientes, contenu long accessible | Pages `boutique`, `produit`, `selection`, `pliage`, `plan`, `production?mode=client`, `realisations`, `contact`, `materiaux`, `estimation`, `estimation-dossier` | Ne pas imposer `overflow:hidden` global ; seules les contraintes existantes de l'accueil restent | Captures Chrome et absence de coupure/scroll horizontal ; longues pages toujours défilables |
| Respect des cinq espaces métier | `chantier.html`, `chantier-app.js`, `portal-client.js`, `entrepot.html`, `coordination.html`, modules Boss/Adjointe/Chef | Aucun changement sur ces fichiers, Auth, Punch, Équipes et heures, Supabase, Android | Garde du diff dans `mir-client-navigation-pr.yml` + CI PR37 |
| Contraste, focus, retour/clavier | Contrôleur public supporte déjà `Escape`, `aria-controls`, `aria-expanded`, focus retour | Conserver ces comportements ; styles d'avatar focus/hover ; aucune interception des touches système | Navigateur : ouvrir/fermer Plus, Escape, lien retour et contraste du bouton |
| SEO / GEO : ne pas ouvrir l'indexation involontaire | Les HTML publics inspectés ont `lang=fr-CA`, `robots=noindex,nofollow` ; autres pages techniques protégées | Aucun changement des règles robots, canonicals ou redirects ; mesurer l'impact futur du SEO/GEO après publication autorisée | Vérification statique des métadonnées et chemins ; **pas de promesse d'indexation** |

## Périmètre et dépendances

- **Client uniquement :** les pages publiques listées ci-dessus ; le mode client du configurateur `production.html?mode=client` conserve le pont existant `mir-production-client-nav.js`, sans changer l'espace Admin du même moteur.
- Les cinq espaces métier **Employé, Chef, Adjointe, Boss, Entrepôt/Livraison** ne reçoivent pas la navigation publique. Aucun changement de schéma, Auth, Punch, gestion, données, paiements, Google, courriels, APK ou production.
- L'URL d'authentification reste un simple accès au portail : le rôle n'est pas choisi dans le lien ou le menu.
- La PR reste enfant de PR37 et doit être réévaluée si la tête de PR37 change. Aucune fusion PR36/PR37 dans main ni publication Pages.
- La recette physique Samsung 0.13.x est **EN ATTENTE**, sans nouvelle demande à Frederick. Les quarts QA synthétiques MIR TEST nécessaires aux CI du présent arbre restent à nettoyer **après** le dernier test natif dépendant, avec les scripts PR39 exacts.

## Recette réelle / captures

Workflow ciblé `.github/workflows/mir-client-navigation-pr.yml` (CI vérifiable dans la PR) : tests Node de navigation, accueil et en-têtes; Chromium sur les routes publiques; séquence clavier/Escape; images originales décodées; contrôle de défilement horizontal, des rails inférieurs et d'absence de connexion en double; captures JPEG `artifacts/mir-client-nav-<format>-{index,boutique}.jpg` aux formats **360, 390, 430, 768, 834, 1024 et 1440**, plus les captures PNG de l'accueil historique. Les captures ne valent preuve visuelle qu'une fois l'artefact CI **ouvert et inspecté**.

**Les tests/CI et SHA final seront ajoutés lors de leur exécution réelle; aucune réussite anticipée.**

## Inventaire FR-CA / EN-CA (préparation uniquement)

La surface client examinée est **FR-CA** (`lang=fr-CA` sur les pages principales). Aucun mécanisme EN complet et vérifié n'a été trouvé au niveau des fichiers publics principaux (`dist` ne comporte pas de `i18n`/module langue identifiable). **EN reste volontairement désactivé; aucun bouton EN, redirection `hreflang=en-CA` ou promesse bilingue n'est ajouté dans ce lot.**

| Zone client à traduire plus tard | Fichiers et contenus à inventorier avant activation EN-CA | Règle de complétude |
| --- | --- | --- |
| En-têtes, menus, sous-menus, pied de page et aide | `index.html`, `mir-public-menu.js`, `mir-help-center.js`, `contact.html`, `realisations.html`, `materiaux.html` | Tous les états accessibles, labels ARIA, messages d'erreur, éléments SEO et descriptions d'images |
| Boutique et sélection | `boutique.html`, `produit.html`, `selection.html`, `commerce.js`, `catalogue.js`, `mir-commerce-quantity.js` | Couleurs, formats, unités/SKU, recherche, panier, favoris, brouillons et PDF `mir-selection-pdf.js` ; aucune variante traduite séparément de son SKU |
| Pliages et configurateurs client | `pliage.html`, `pliage.js`, `production.html` **mode client seulement**, `mir-production-client-nav.js`, `mir-bending-presets.js`, `mir-bending-finishes.js` | Descriptions de profils, lettres de mesure, aperçu, aides, validations, paniers et dimensions ; moteur Admin inchangé |
| Studio/visualisation | `plan.html`, `plan-app.js`, `plan-3d.js`, `plan-import.js`, `plan-notes.js` | Outils, import de plans, tutoriels, avertissements, erreurs et fichiers exportés |
| Estimation et dossiers privés clients | `estimation.html`, `estimation-dossier.html`, `mir-estimate.js`, `mir-estimate-private.js`, `mir-estimate-presentation.js`, `mir-unified-client-dossier.js` | Formulaires, accusés de réception, validations, états hors ligne, autorisations et **documents complets**, y compris PDF générés par `mir-dossier-pdf.js` |
| Compte, soutien et retour au contexte | `chantier.html` seulement pour l'entrée client et l'aide publique, `mir-client-return.js`, textes clients visibles via `portal-client.js` | Vérifier les rôles réels en recette sans appliquer l'anglais aux cinq espaces métier |

### Critères d'activation future EN-CA

Le parcours EN-CA exigera un inventaire chaîne-par-chaîne, des traductions de tous les textes et documents (PDF exportés inclus), des URL et reprises d'état correctes, `lang` et métadonnées cohérents, le choix de langue persistant sans pollution entre comptes, des tests clavier/taille des textes et une certification client intégrale. **Tant que cela manque, aucune option EN visible et aucune déclaration « bilingue ».**

## Lacunes hors de ce lot

Les photos exactes, références produit et conditionnements catalogue non confirmés restent dans la matrice PR39, sans invention. Les multiples entrées des configurateurs non démontrées comme des doublons sont conservées. Les pages techniques `studio.html`, `calepinage.html` et `metres.html` requièrent un classement explicite de leurs accès clients/administratifs avant toute traduction générale. Les protections de l'indexation publique ne changent pas.
