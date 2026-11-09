# Raccordement Supabase / Resend — 9 novembre 2026

## État livré

Base de travail : `main` au commit `2a9cc1f84bbd6b5ba1551de56cfbea41d693b891`. Accueil et moteurs Pliage conservés. GitHub Pages reste l’hôte du site. Seul **MIR TEST** a reçu la fonction et les quatre migrations ; **aucun déploiement API en production**. Envoi public désactivé, diagnostic d’écriture admin TEST refermé après les essais.

API TEST : https://hxtztkmbfpmzrieccwsg.supabase.co/functions/v1/mir-estimates/config

Interface de recette : https://revetementsmirweb.github.io/MIR/estimation.html?recette=1

Le guide [MIR_ESTIMATIONS_SERVER.md](../../MIR_ESTIMATIONS_SERVER.md) donne l’architecture, les URL de configuration et les actions restantes. Aucun secret ni jeton de reprise n’est conservé dans ce rapport.

## Vérifications réellement effectuées

| Vérification | Résultat et périmètre |
|---|---|
| Postgres, Storage, Auth MIR TEST | Réels ; quatre sources enregistrées, originaux privés téléchargés et SHA-256 comparés. Voir [real-api.json](real-api.json). |
| Limites | Réel : 5 PDF et 25 Mio cumulés, dont un original de 20 Mio. 20 Mio + 1 octet, cumul supérieur à 25 Mio et six PDF refusés. [real-boundaries.json](real-boundaries.json). |
| Gros PDF | Réel : quatre blocs de 6/6/6/2 Mio ; rejeu du premier bloc après réponse supposée perdue, offset confirmé sans duplication ; SHA final identique. L’exécution initiale est conservée dans [real-chunk-run.txt](real-chunk-run.txt). |
| Écrasement | Réel : tentative `x-upsert:true` avec le jeton signé refusée HTTP 400, original de 20 Mio inchangé. |
| Accès privé | Vrai compte admin MIR TEST autorisé ; après accord explicite, vrai compte employé QA temporairement autorisé : quatre fiches, originaux PDF et Studio accessibles. Autorisation retirée, puis refus 403 confirmés. Visiteur 401, client et autre organisme 403. [Preuve QA](real-staff-access.json). Le véritable compte d’adjointe reste à confirmer. |
| Immutabilité | Réel : renvoi du même UUID avec Studio modifié refusé 409 ; original retrouvé. Déclencheur SQL vérifié : `IMMUTABLE_SUBMISSION`, transaction d’essai annulée. |
| Envoi sans configuration | Avant configuration : réel 503, aucun faux reçu, aucune demande `received`, aucun courriel externe envoyé. |
| Courriel réel autorisé | Après configuration par MIR : une demande panier fictive, un PDF de 1 039 octets joint, Resend accepté et état `received` durable. Répétition : même reçu. Réception en boîte encore à confirmer. [Preuve](real-mail.json). L’envoi public est resté fermé. |
| Domaines Resend | Sonde privée réelle : HTTP 401 de Resend pour la lecture des domaines. Aucun domaine/DNS/abonnement modifié. [Résultat exact](resend-domain.json). |
| Doubles clics / réponse perdue Resend / panne après acceptation | Tests du vrai code Edge avec frontières RPC/Storage/Resend simulées : fiche et corps d’envoi stables, reprise sans deuxième courriel, verrou transactionnel testé via fixture. À refaire avec Resend réel. |
| Contrat et service Node existant | 8 tests réussis, validations réutilisées. |
| Code Edge | 9 tests réussis, quatre sources, droits, empreintes, limites, idempotence, expiration et configuration fermée. La reprise après expiration de session TUS est couverte avec le stockage simulé. |
| Parcours navigateur | 12 parcours réussis, quatre entrées × trois tailles ; vrais formulaires, imports/exports PDF et brouillons. Supabase et Resend simulés dans cette série. |
| Régression parcours client | Chromium 390 et 1440 : Pliage/dossier et autres parcours existants réussis. |

### Matrice navigateur

| Taille émulée | Général | Studio | Panier | Pliage | Brouillon/reprise | Instantané privé |
|---|---|---|---|---|---|---|
| 390 × 844 | OK | OK | OK | OK | OK, dont gros PDF 20 Mio | OK |
| 834 × 1112 | OK | OK | OK | OK | OK | OK |
| 1440 × 900 | OK | OK | OK | OK | OK | OK |

Ces parcours utilisent Chromium, des données fictives, les images et polices chargées. **Aucun appareil physique testé.** Les courriels de cette série navigateur sont simulés. Un essai API séparé a ensuite été accepté par le vrai Resend ; sa réception humaine reste à confirmer. [Résultats UI](simulated-ui/browser-results.json), [formulaire après reçu simulé](simulated-ui/general-received-390.png), [résumé Studio](simulated-ui/studio-review-390.png), [fiche privée simulée](simulated-ui/private-studio-390.png).

Un test navigateur distinct lit la véritable API TEST depuis l’interface à trois tailles. Avant publication, il utilise les fichiers locaux sous l’origine officielle et le réseau Supabase réel ; ce n’est pas une preuve de publication. Le workflow Pages rejoue ensuite le même test **sur les pages publiées**, sans upload ni envoi, et archive `artifacts/estimation-edge-published/results.json`. Il vérifie les limites et que le bouton reste désactivé quand le service l’est. L’activation du bouton après formulaire valide est vérifiée avec le fournisseur simulé ; elle ne constitue pas une activation publique.

## Capacité et accès

Organisation existante **Free**. Mesure : MIR 14 759 603 octets de base et zéro objet Storage ; MIR TEST 13 538 995 octets de base, neuf objets de recette totalisant 47 191 055 octets. Après l’essai Resend : huit fiches, 152 048 655 octets réservés (incluant autorisations d’upload non expirées), un reçu durable et une réservation de courriel pour la journée. Budget applicatif TEST 300 Mio ; défaut production 400 Mio. Aucun forfait payant souscrit. L’usage global et les quotas Resend n’ont pas pu être consultés sans accès au compte Resend ; l’objectif 0 $ n’est pas une promesse de capacité illimitée.

Les tables de ce module ont RLS et aucun droit client ; le bucket reste privé (maximum 20 Mio). La revue Supabase signale l’absence volontaire de politiques sur ces tables fermées, et des avertissements préexistants hors de ce module ; aucune nouvelle fonction publique SECURITY DEFINER ajoutée.

## Bloqué : recette réelle et activation

1. **Domaines/compte Resend** : l’envoi fonctionne avec les secrets fournis par MIR, mais la lecture des domaines est refusée HTTP 401. Dans Resend → Domains, vérifier l’expéditeur MIR existant ou préparer `envoi.revetementsmir.com`, puis copier les valeurs exactes générées dans la zone DNS. Aucune valeur inventée. Le gestionnaire DNS n’est pas identifié ; préserver les MX/SPF/DKIM de la boîte existante. Le forfait Free et les quotas globaux du compte Resend restent à confirmer dans le Dashboard ; aucun achat effectué.
2. **État des secrets et garde-fous** : `RESEND_API_KEY`, `MIR_ESTIMATE_FROM`, `MIR_ESTIMATE_TO` et `MIR_ESTIMATE_MODE=test` sont détectés et un courriel de recette est accepté. `MIR_ESTIMATE_ENABLED` et `settings.enabled` restent fermés. La voie de recette exige un admin TEST et `diagnostics=true` temporaire ; ce mode a été refermé. La boîte autorisée reste privée, aucun secret dans le dépôt.
3. **Compte adjointe** : compte exact non confirmé. Après une première tentative refusée par la revue automatique, MIR a explicitement autorisé l’ajout temporaire du seul compte employé QA dans MIR TEST. Ajout sans remplacement des accès existants, tests réels réussis, puis retrait et refus vérifiés. Aucun droit de production modifié. Voir `real-staff-access.json`. Cette validation QA ne remplace pas celle du véritable compte d’adjointe.
4. **Recette réelle** : recevoir les quatre courriels dans la boîte contrôlée, ouvrir les deux PDF joints, valider les liens avec le vrai compte d’adjointe et les refus, rejouer doublon/panne/reprise et modification ultérieure du Studio. Un seul essai API avec PDF est accepté par Resend ; confirmation de réception attendue. La recette complète réelle des quatre entrées et du compte d’adjointe n’est pas validée.
5. Après réussite seulement : déployer dans MIR, destinataire imposé `estimation@revetementsmir.com`, configurer la seule URL publique de production, republier et refaire le parcours réel. Jusqu’à là, garder le bouton public désactivé.
