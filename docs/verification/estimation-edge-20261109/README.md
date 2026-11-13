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
| Courriel réel autorisé | Après configuration par MIR : une demande panier fictive, un PDF de 1 039 octets joint, Resend accepté et état `received` durable. Répétition : même reçu. Réception et ouverture du PDF confirmées par MIR. [Preuve](real-mail.json). L’envoi public est resté fermé. |
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

Ces parcours utilisent Chromium, des données fictives, les images et polices chargées. **Aucun appareil physique testé.** Les courriels de cette série navigateur sont simulés. Un essai API puis quatre parcours UI séparés ont ensuite utilisé le vrai Resend ; MIR confirme la réception des cinq courriels et l’ouverture des PDF. [Résultats UI](simulated-ui/browser-results.json), [formulaire après reçu simulé](simulated-ui/general-received-390.png), [résumé Studio](simulated-ui/studio-review-390.png), [fiche privée simulée](simulated-ui/private-studio-390.png).

Un test navigateur distinct lit la véritable API TEST depuis l’interface à trois tailles. Avant publication, il utilise les fichiers locaux sous l’origine officielle et le réseau Supabase réel ; ce n’est pas une preuve de publication. Le workflow Pages rejoue ensuite le même test **sur les pages publiées**, sans upload ni envoi, et archive `artifacts/estimation-edge-published/results.json`. Il vérifie les limites et que le bouton reste désactivé quand le service l’est. L’activation du bouton après formulaire valide est vérifiée avec le fournisseur simulé ; elle ne constitue pas une activation publique.

## Recette UI avec le vrai Supabase et le vrai Resend

Les quatre sources ont été soumises par les formulaires à **390 × 844**, avec données fictives, puis rouvertes par leurs boutons à **390 × 844, 834 × 1112 et 1440 × 900**, sans nouvel envoi. Contextes tactiles pour cellulaire/tablette et contexte souris distinct à 1440 ; redémarrage du navigateur en conservant IndexedDB. La variante `--resume-only` interdit les nouvelles soumissions.

Cette série utilise les vrais fichiers `dist` sous l’origine officielle **dans un relais local de recette**, l’authentification admin MIR TEST réelle, le Storage privé réel et Resend réel. Le relais active uniquement le formulaire dans son navigateur et dirige le POST final vers la voie privée `/test/submit` ; **le serveur public est resté désactivé**. Cela ne remplace pas les vérifications réseau Pages réalisées séparément dans GitHub Actions.

- Général : original fictif, rechargement, interruption réseau injectée avant la transmission, reprise du même UUID et reçu réel. Le défaut réseau est simulé ; le stockage et l’envoi de la reprise sont réels.
- Pliage : L créé par l’interface, finition, dossier et PDF natif de 275 333 octets, envoi réel.
- Panier : sélection Kaycan par l’interface, quantité deux, PDF natif complet de 550 533 octets, envoi réel.
- Studio : PDF original fictif importé, ouverture ajoutée, quatre façades, groupes À estimer/Aperçu seulement, envoi réel. Après changement local de fabricant et rechargement, la copie soumise reste identique.
- Fiche privée : vrai SDK Auth avec session QA admin, quatre façades chargées et vraie vue 3D de l’instantané ; originaux retéléchargés, SHA-256 identiques.
- MIR confirme les **quatre courriels supplémentaires reçus** et les **deux PDF natifs ouverts**. Le premier essai API est aussi reçu et son PDF ouvert. Aucun appareil physique testé.

[Résultats réels](live-ui/results.json) · [Confirmation en boîte](mailbox-confirmation.json) · [Reçu général](live-ui/general-390.png) · [Dossier de pliage](live-ui/bending-390.png) · [Panier](live-ui/cart-390.png) · [Studio soumis](live-ui/studio-review-390.png) · [Fiche privée réelle](live-ui/private-studio-390.png).

Les attentes d’images chargées à la demande et la configuration tactile du pilote de recette ont été ajustées pendant la passe de reprise ; aucun correctif du site n’a été nécessaire pour ces deux problèmes de pilote.

## Capacité et accès

Organisation existante **Free**. Mesure : MIR 14 759 603 octets de base et zéro objet Storage ; MIR TEST 13 858 483 octets de base, treize objets de recette totalisant 48 030 187 octets. Après les essais Resend : douze fiches, 152 887 787 octets réservés (incluant autorisations d’upload non expirées), cinq reçus durables et cinq réservations de courriel pour la journée. Budget applicatif TEST 300 Mio ; défaut production 400 Mio. Aucun forfait payant souscrit. L’usage global et les quotas Resend n’ont pas pu être consultés sans accès au compte Resend ; l’objectif 0 $ n’est pas une promesse de capacité illimitée.

Les tables de ce module ont RLS et aucun droit client ; le bucket reste privé (maximum 20 Mio). La revue Supabase signale l’absence volontaire de politiques sur ces tables fermées, et des avertissements préexistants hors de ce module ; aucune nouvelle fonction publique SECURITY DEFINER ajoutée.

## Bloqué : recette réelle et activation

1. **Domaines/compte Resend** : l’envoi fonctionne avec les secrets fournis par MIR, mais la lecture des domaines est refusée HTTP 401. Dans Resend → Domains, vérifier l’expéditeur MIR existant ou préparer `envoi.revetementsmir.com`, puis copier les valeurs exactes générées dans la zone DNS. Aucune valeur inventée. Le gestionnaire DNS n’est pas identifié ; préserver les MX/SPF/DKIM de la boîte existante. Le forfait Free et les quotas globaux du compte Resend restent à confirmer dans le Dashboard ; aucun achat effectué.
2. **État des secrets et garde-fous** : `RESEND_API_KEY`, `MIR_ESTIMATE_FROM`, `MIR_ESTIMATE_TO` et `MIR_ESTIMATE_MODE=test` sont détectés et cinq courriels de recette sont acceptés et leur réception confirmée. `MIR_ESTIMATE_ENABLED` et `settings.enabled` restent fermés. La voie de recette exige un admin TEST et `diagnostics=true` temporaire ; ce mode a été refermé. La boîte autorisée reste privée, aucun secret dans le dépôt.
3. **Compte adjointe** : compte exact non confirmé. Après une première tentative refusée par la revue automatique, MIR a explicitement autorisé l’ajout temporaire du seul compte employé QA dans MIR TEST. Ajout sans remplacement des accès existants, tests réels réussis, puis retrait et refus vérifiés. Aucun droit de production modifié. Voir `real-staff-access.json`. Cette validation QA ne remplace pas celle du véritable compte d’adjointe.
4. **Recette réelle** : le premier essai API et les quatre entrées UI sont acceptés par Resend et reçus ; les PDF natifs sont ouverts. Reprise, refus et immutabilité sont vérifiés. Le véritable compte d’adjointe reste à valider.
5. Après réussite seulement : déployer dans MIR, destinataire imposé `estimation@revetementsmir.com`, configurer la seule URL publique de production, republier et refaire le parcours réel. Jusqu’à là, garder le bouton public désactivé.
