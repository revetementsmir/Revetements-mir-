# Hotfix post-PR #23 — quantité et tarif de pliage

Révision de base : `b087270a901cad0e5ebe06a7193769c1a9291179`.

## Cause reproduite

Les quatre tentatives post-fusion ont expiré au même endroit :
`tests/mir-client-bend-tariff-browser.cjs:63`, en attendant `9,40` dans
`#panel-price`.

L’état DOM recueilli localement avant correction était :

- étape client `5`;
- statut `Quantité entière à préciser.`;
- quantité vide et requise dans le modèle;
- libellé de quantité rendu avec `display: none`;
- panneau tarifaire `Prix à confirmer par MIR.`;
- aucune erreur JavaScript ni requête tarifaire échouée.

La règle résiduelle responsable était dans
`dist/mir-production-signature.css` : elle masquait explicitement le libellé
contenant `#production-quantity`. Le dessin libre conservait en plus une
ancienne quantité implicite de `1` dans `startProfileDrawing()`.

Il s’agissait donc d’une vraie régression d’interface : le serveur de tarif
répondait, mais l’utilisateur ne pouvait pas satisfaire la nouvelle quantité
obligatoire de la PR #23.

## Correction et contrôle strict

- le champ quantité est visible à l’étape Matériau et couleur;
- il commence vide pour les modèles et dessins libres clients;
- le bouton reste désactivé et aucun prix de ligne n’est accepté sans quantité;
- une quantité entière explicite déclenche le tarif exact;
- la quantité est conservée dans le dossier, le total et le PDF;
- aucun timeout, délai arbitraire, skip ou assertion affaiblie n’a été ajouté.

Le contrôle tarifaire vérifie `9,40 CAD` par moulure, `112,80 CAD` pour douze
pièces, puis `124,08 CAD` après la révision de 10 % du tarif aluminium. Il
refuse aussi `NaN`, `0,00` et toute quantité implicite.

## Résultats locaux

- tarif/PDF : 390×844, 834×1112, 1366×768 et 1440×900 réussis;
- chaîne Courriels/PDF complète réussie, sans envoi externe;
- chaîne Pages prépublication exécutée avec Chromium disponible; parcours
  Pliage, estimation simulée, dossier, PDF et portail réussis après mise à jour
  des fixtures vers une quantité explicite;
- Pliage client : 360×780 à 1440×900 réussi;
- Phase 6 : 7/7;
- serveur UX Commandes : 23/23;
- coordination PostgreSQL : 19/19;
- coordination métier : 20/20;
- Entrepôt : 15 scénarios;
- Aujourd’hui : 7/7 et navigateur six formats;
- Punch : 20 scénarios et navigateur six formats;
- Absences : 8 scénarios et quatre formats;
- Dépenses : 11 scénarios;
- Auth/session et Clavardage : contrôles ciblés réussis;
- `git diff --check` réussi.

Tous les essais sont locaux ou utilisent PostgreSQL jetable. Aucune commande,
estimation, migration, requête Supabase, opération fournisseur ou transmission
de courriel réelle n’a été effectuée.
