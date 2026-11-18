# Estimation 04 — non-régression des autres fenêtres

Recette du 18 novembre 2026 : **9 scénarios réussis, aucun échec final**.

| Entrée existante | Téléphone 390 × 844 | Tablette 834 × 1112 | PC 1440 × 900 |
| --- | --- | --- | --- |
| Pliage | Réussi | Réussi | Réussi |
| Panier | Réussi | Réussi | Réussi |
| Studio | Réussi | Réussi | Réussi |

Commande : `node tests/mir-estimation-04-modal-browser.cjs`.

Les contrôles utilisent Chromium, les écrans actuels et leurs vrais boutons. Les parcours de préparation créent une moulure dessinée et un article du catalogue Kaycan. Les menus de section existants permettent d’atteindre les contrôles, sans forcer des éléments masqués. Le Studio fournit son véritable instantané au moteur d’estimation.

Pour chaque entrée : coordonnées, municipalité, notes, sélection ou instantané 3D, PDF natif lorsqu’il existe et PDF joint sont transmis à une fixture HTTP locale. Le test compare le JSON stocké au brouillon normalisé et les octets des documents à leur empreinte SHA-256. Les anciens formulaires ne reçoivent pas `projectDetails`. Le reçu est retrouvé dans IndexedDB ; sa réouverture par le bouton public affiche la réception et interdit un second envoi. Le cas panier PC simule aussi un échec puis une reprise, sans double réception.

Aucun réseau externe n’est autorisé par la recette. Les seules origines admises sont le serveur de fichiers et le service de capture sur `127.0.0.1`. Les tentatives d’accès aux tarifs distants sont bloquées. Aucune écriture Supabase et aucun courriel réel ne sont effectués. Il s’agit d’émulation de tailles, pas d’appareils physiques.

## Preuves

- [Résultats complets](modals/results.json).
- [Pliage PC](modals/bending-review-1440.png).
- [Panier PC](modals/cart-review-1440.png).
- [Studio PC](modals/studio-review-1440.png).

## Ancien scénario et diagnostics conservés

`tests/mir-estimate-real-ui.cjs` n’a pas été exécuté : ce script utilise explicitement Supabase, Storage et Resend réels.

`tests/mir-estimate-browser.cjs` a été exécuté **sans modification**, dans un dossier temporaire pour préserver ses anciennes preuves. Il échoue avant l’envoi, car il attend que `#estimate-limits` soit visible dès l’arrivée sur la page générale ; ce texte appartient maintenant à l’étape des documents. Les empreintes du fichier original et de la copie sont identiques : voir [diagnostic](historical-browser.json) et [journal](historical-browser.log). Ce résultat ne constitue pas un échec du transport.

Le même test a ensuite été réellement exécuté, toujours inchangé, sur la base propre `7ae54b3`. Il échoue déjà au même premier sélecteur, avec `data-mir-page-visible="false"`. Le problème du scénario est donc préexistant : [preuve sur la base intacte](historical-baseline.md).

Les premières versions du nouveau harnais reprenaient d’anciens gestes de préparation : bouton Suivant avant sélection du matériau, confirmation d’ajout de pliage non fermée, contrôles produit/Studio masqués par leurs menus de section. Une réouverture directe de l’API immédiatement après `dialog.close()` précédait aussi l’événement de fermeture. Ces diagnostics sont conservés dans `modals/initial-harness/` et `modals/section-harness/`. Seul le nouveau scénario a été corrigé pour utiliser les menus et les lanceurs publics après rendu ; aucun écran ni moteur hors Estimation 04 n’a été modifié pour faire passer la recette.
