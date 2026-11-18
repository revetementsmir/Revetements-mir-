# Estimation 04 — contrat et services

Vérification locale du 18 novembre 2026. Base : `7ae54b3525dc792ba10aafa7079addeb3829a4fe`, branche `codex/estimation-04-images-20261118`.

## Données conservées

Le contrat commun à Node et Edge conserve désormais un objet facultatif `projectDetails` :

| Champ | Valeurs acceptées |
| --- | --- |
| `type` | `house`, `chalet`, `multi_unit`, `renovation` |
| `timeline`, facultatif | `undecided`, `asap`, `within_3_months`, `within_6_months`, `later` |
| `dimensions`, facultatif | Texte, 2000 caractères au maximum |
| `materials`, facultatif | Texte, 2000 caractères au maximum |

La municipalité reste `address.city`. Les coordonnées, l’adresse complète, la note, les sélections, les instantanés du Studio et les PDF suivent le contrat existant. Les matériaux souhaités ne remplacent pas les articles du panier.

L’absence historique de `projectDetails` reste une absence : aucun objet ni défaut n’est injecté. Les empreintes et reprises des anciennes demandes sont conservées. `renovation` est une vraie valeur distincte ; aucune ancienne valeur `autre` n’existe dans le contrat de cette base.

Un objet de projet invalide, un type ou échéancier inconnu, une clé inconnue ou un texte trop long sont refusés explicitement avant stockage. Les nouvelles données ne sont donc pas supprimées silencieusement.

## Services et limites du lot

Les configurations Node (`/api/estimates/config`) et Edge (`/config`) annoncent `projectDetailsVersion: 1`, y compris lorsque l’envoi reste désactivé. Cela permet au client de vérifier la capacité avant de transmettre un nouveau dossier. Cette modification de code n’active aucun service.

Le stockage existant conserve le JSON normalisé complet. Aucune migration SQL, modification de droits ou écriture Supabase n’est nécessaire ni effectuée. Les notifications partagées comprennent les quatre nouveaux champs présents, sans troncature, avec échappement HTML. Les deux copies du formateur restent identiques.

Aucune interface employé, aucun moteur PDF et aucun écran public n’ont été modifiés dans ce sous-lot contrat/services. Aucun déploiement backend et aucun courriel réel n’ont été effectués.

## Vérification exécutée

```sh
node --test --test-reporter=tap \
  tests/mir-estimation-04-contract.cjs \
  tests/mir-estimate-presentation.cjs \
  tests/mir-estimate-edge.cjs \
  tests/mir-estimate-service.cjs
```

Résultat : **32 tests réussis, aucun échec**. Le nouveau fichier contient neuf scénarios : formes et empreintes historiques des quatre provenances ; quatre types et cinq échéanciers ; bornes et erreurs ; annonces de capacité ; persistance complète Node ; persistance complète Edge simulée ; reprises historiques ; refus avant stockage ; notifications et échappement.

Le transport Edge est entièrement injecté en mémoire. Les nouveaux tests Node utilisent des fichiers temporaires et une notification capturée en mémoire. Les anciens tests HTTP utilisent uniquement une boîte de capture sur `127.0.0.1`. Aucun destinataire externe ni backend Supabase n’est contacté.

`git diff --check` : aucune anomalie sur les fichiers de ce sous-lot.

Contrôle complémentaire : les notifications de trois demandes anciennes (général et deux fixtures existantes) ont été comparées au formateur exact de la base `7ae54b3`. Sujet, texte et HTML sont identiques ; l’ajout ne change pas le corps d’une ancienne notification lors d’une reprise.

## Documentation consultée

Compétence Supabase consultée, puis documentation officielle ouverte le 18 novembre 2026 :

- [Changelog Supabase](https://supabase.com/changelog.md), notamment les changements de novembre 2026.
- [JSON et JSONB](https://supabase.com/docs/guides/database/json) : conservation d’un objet à schéma variable dans une colonne JSONB existante.
- [Tests des Edge Functions](https://supabase.com/docs/guides/functions/unit-test) : isolation des règles métier et tests sans effets externes.
