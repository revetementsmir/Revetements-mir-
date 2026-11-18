# Fenêtres du Studio — harmonisation des surfaces

Base : `e0cd92d9e6dd01b3f6697dd7de972df95839c8e1`. La seule source application détenue ici est `dist/mir-studio-surfaces.css` ; le chargement dans `plan.html` est intégré par le responsable du lot.

Les neuf surfaces ciblées sont la matériauthèque, la fiche matériau, les ouvertures, l’import PDF, les projets enregistrés, la source importée, le réglage du volume, la demande d’estimation et l’avis PDF prêt. Les détails existants et le toast reçoivent aussi les couleurs MIR. Fond anthracite `#242522`, panneaux `#34352f`, texte crème et accent sable ; états erreur, sélection, survol, désactivation et focus conservés.

Aucune commande du Studio n’a été déplacée, supprimée ou regroupée. La géométrie, les règles du modèle, le stockage et les moteurs ne sont pas modifiés. Les images de plans, échantillons fabricants et le canevas clair gardent leur rendu propre. Les seuls `!important` servent aux styles inline de l’avis PDF et à la taille du badge documentaire déjà forcée par le CSS historique.

## Preuves

- `before/` : 12 captures réelles issues de la révision de base via le serveur `git show` de la recette indépendante.
- `checks/` : 15 captures après, aux formats 1440×900, 834×1194 et 390×844, avec le même catalogue et des PDF synthétiques uniquement. L’état volume invalide est un contrôle additionnel, sans comparaison avant identique revendiquée.
- `checks/report.json` : 18 mesures de contraste sur les textes rendus, minimum 7.02:1 ; boutons d’envoi et d’ouverture réellement désactivés et visuellement distincts ; aucun débordement horizontal ; saisie de dimensions invalides sans changement du modèle.
- Les trois gardes `?embed=1`, `?context=admin`, `?mode=atelier` restent exclues : marqueur client et variables de cette feuille absents.
- Aucun transport externe, aucune requête hors GET, aucune demande réelle envoyée. Zéro erreur JavaScript ou HTTP sur le contrôle ciblé final.

La recette générale des neuf surfaces, les copies FR/EN et les exports PDF sont détenus par les responsables QA/PDF du même lot. Les premières captures anglaises avaient révélé des traductions préexistantes manquantes, notamment Import et Volume ; ces captures de développement ne sont pas présentées comme preuve d’un bilingue complet. Le contrôle ciblé de ce dossier est en français. Le texte du sélecteur de fichier natif dépend de la langue du navigateur.

## Vérification reproductible

Exécuter `node docs/verification/studio-harmonie-20261118/surfaces/visual-check.cjs` avec Playwright disponible et Chromium `/usr/bin/chromium`. Le serveur de test ne permet que les lectures locales. Le script ouvre les vrais contrôles, ne remplace pas le DOM application et ne produit aucun envoi réel.

Feuille examinée : SHA-256 `34c426f2878697f6becb3ea7e1deccdfaf897c9b307b7128397bbd152a3ba4cb`.
