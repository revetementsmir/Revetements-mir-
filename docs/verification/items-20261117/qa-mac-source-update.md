# Complément de recette MAC — source détaillant du 17 novembre 2026

Les huit captures MAC ont été remplacées après enrichissement de la même référence `mir-request-mac-screws` avec la page Aluminium B. Bouchard fournie par MIR. Aucun autre produit ni fichier applicatif n’a été modifié par cette recette.

- Boutique FR et EN, 1440 × 1100 et 390 × 844 ; revue magasin et véritable écran chantier avec fixture local, aux deux largeurs.
- 12 contrôles réussis : recherches publiques « MAC » et « 1790291 », présence de la boîte de 500 dans chaque parcours, unité publique `boîtes` conservée avec libellé anglais `boxes`, ajout public désactivé et rejet métier dans les deux magasins locaux.
- Aucun débordement horizontal, aucune erreur JavaScript `pageerror`. Les huit captures sont des vues viewport réelles (`fullPage:false`).
- Aucun accès externe transmis, aucune soumission réelle et aucun appel d’envoi dans le fixture. Dix tentatives automatiques de prix/météo ont été bloquées avant transmission.

La longueur reste à confirmer : 1⅛ po dans une version du titre, 1½ po dans les spécifications du détaillant. Le code 1790291 reste une référence détaillant ; aucun SKU MIR, prix MIR ou stock MIR n’en est déduit. La photo originale n’est pas disponible localement et le visuel manquant reste explicitement signalé dans la boutique.

Les captures chantier utilisent le vrai composant d’interface avec le fixture de test local existant, **sans connexion employé réelle**. Elles ne certifient pas la publication de cette référence dans le snapshot serveur. PRIME et Hardie n’ont pas été recertifiés dans ce complément.

Preuves : `qa-mac-source-update.json` contient les textes rendus, valeurs d’unité, rejets et références des huit captures. Reproduction locale : `node docs/verification/items-20261117/qa-mac-source-update.cjs`. Le script bloque toute requête extérieure et toute méthode HTTP autre que GET.
