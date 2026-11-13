# PR #64 — recette avant publication

Base main : `cca24dae6e093f638c1056127b87f3f1cf4f55b3`. PR reprise au SHA `10d1cf5a297fa01e8408e94477468cdbf86eb292`.

## Entrepôt — vérification réelle réussie

Compte admin de recette connecté via Supabase Auth au projet de production **MIR** (`gccltmaulvrnthrbnrpd`). Identité relue par `auth.getUser`, droits admin/Entrepôt relus par le RPC serveur. Aucun SDK ni RPC simulé dans cette recette.

- « Ajouter un article » avec numéro et référence vides génère le SKU **MIR-0529CF019C1542DA**.
- La fiche `RECETTE PR64 — Validation QR — STOCK NUL` a été créée, sans entrée/sortie de stock.
- L’image QR réellement générée a été décodée avec ZXing-C++ 2.3.0, puis son contenu a été remis au formulaire de scan natif. Le serveur retourne exactement le même identifiant de fiche.
- Nouvelle inscription du même article : même SKU, même QR, aucun doublon. Rechargement authentifié du lien QR : même fiche.
- Étiquette affichée et imprimable ; PDF produit avec les styles d’impression natifs. Captures Chromium aux formats 1440×1000, 390×844 et 834×1112. Aucun essai avec une caméra physique ni affirmation de validation Safari/iPadOS.
- Zéro appel à `mir_warehouse_move`. Vérification SQL : aucun mouvement de stock et aucune commande créée. La seule donnée de recette persistante est cette fiche explicitement nommée.

**Défaut corrigé pendant l’essai :** `.wh-label-preview { display:none }` cachait l’étiquette en dehors du mode impression. L’aperçu est maintenant visible dans la fiche et sa largeur s’adapte au téléphone. Après création, la vue rejoint l’étiquette. Les règles d’impression 100×60 mm restent conservées.

[Rapport réel](warehouse-live.json) · [QR décodé](qr-admin-label.png) · [Étiquette PDF](etiquette-admin.pdf) · [Téléphone](entrepot-etiquette-390.png) · [Tablette](entrepot-etiquette-834.png) · [Fiche PC](entrepot-admin-fiche-pc.png)

Reproduction : `node tools/validation/pr64-warehouse-live.cjs` avec les secrets configurés `MIR_TEST_ADMIN_EMAIL` / `MIR_TEST_ADMIN_PASSWORD`. Le relais Python conserve HTTPS et la vérification des certificats ; il ne simule aucune réponse. Installer ZXing-C++ 2.3.0 dans `/tmp/mir-pr64-qrdecoder` pour le décodage de l’image. Ne jamais placer les identifiants dans le dépôt.

## Migration Supabase — contrôles préparatoires réussis, application bloquée

Migration : `supabase/migrations/20261108220726_boutique_bend_tariff.sql`.

- Absente de l’historique du projet MIR à la vérification.
- Empreintes des RPC actuels identiques aux garde-fous de la migration : snapshot `739d8cc4966c7e95f2d4467921e64f69`, submit `9a39dc5a40a8cd093e31c2659d3fec0b`.
- Tables existantes de `mir_core` avec RLS ; rôles API sans `bypassrls`. Extension HTTP disponible, mais pas installée.
- Migration relue : nouvelles tables privées avec RLS et révocation des accès directs ; RPC admin/client avec vérification serveur ; données d’adresse propres au compte ; aucun prix ou rôle fourni par le navigateur n’est accepté comme autorité.
- Suite `tests/mir-database.cjs` exécutée avec PostgreSQL WASM réel : réussie. Ceci ne prouve pas l’exécution de l’extension HTTP sur Supabase hébergé.
- **L’application a été refusée par la revue automatique**, qui exige une autorisation explicite pour cette mutation persistante de production : tables/fonctions, extension HTTP, permissions, retrait d’une contrainte et remplacement de deux RPC. Aucun contournement ni DDL alternatif n’a été exécuté. Aucun changement de migration appliqué sur MIR.

Les avis Supabase préexistants ont été consultés : fonctions `SECURITY DEFINER` exposées aux comptes authentifiés (architecture RPC avec contrôles internes), tables privées avec RLS sans politique directe, protection des mots de passe compromis non activée. Aucun de ces réglages n’a été modifié dans cette reprise.

## Livraison et publication — en attente de la migration

Adresse de recette prévue : **1653 avenue des Affaires, Québec, QC, G3J 1Y7, Canada**, destinataire `RECETTE PR64 — NE PAS LIVRER`.

À exécuter après autorisation et application : création d’une adresse temporaire du compte client de recette via RPC, géocodage réel Adresses Québec et calcul de distance serveur, vérification des frais (300 $ exclus du seuil de gratuité, au-delà de 300 $ et au plus 40 km : gratuit ; jusqu’à 80 km : tarif configuré ; au-delà ou adresse incertaine : soumission), refus d’accès croisés, suppression de la seule adresse temporaire, contrôle du nombre de commandes inchangé.

**Le calcul de livraison hébergé n’est pas déclaré validé. La PR n’est ni fusionnée ni publiée**, car la publication demandée dépend de cette recette réelle. Les huit CI initiales de la PR étaient vertes avant la correction d’affichage QR ; les CI doivent être relues sur le nouveau SHA avant fusion. Après recette complète : fusion de cette PR uniquement, suivi du workflow Pages et de sa vérification des fichiers publiés.
