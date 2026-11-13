# Clavardage Phase 3A — matrice de sécurité

Base : `39de53260a134bae48143c1bdb1aa235335d6187`. Rôles et autorisations chantier existants réutilisés, aucun nouveau rôle.

Mise à niveau courante : main `ebf54f676a84fc01717543f0cec224a173f90171` vérifié. Les règles métier ci-dessous sont conservées. La nouvelle passerelle de fichiers est **hébergée et activée sur MIR TEST seulement**. La recette passerelle compte 38/38 contrôles réussis : retrait, nouvelle lecture refusée, réintégration, nouvelle lecture autorisée, expiration naturelle, déconnexion/renouvellement et restauration QA. La recette ponctuelle du second tenant ajoute 10/10 contrôles réels : accès positifs A et B et refus croisés A→B/B→A sur conversations et fichiers. Voir [le rapport courant](mir-chat-phase3a-private-files.md).

| Contrôle fichiers chat | MIR TEST actuellement installé | Après activation préparée, non appliquée |
|---|---|---|
| Employé/Chef/Adjointe/Boss/Admin lisent | Seulement leurs conversations; cache résiduel constaté | Même accès métier, revérifié au POST avant et après lecture des octets |
| Entrepôt | Périmètre logistique existant | Identique, aucun nouveau droit |
| Lire/uploader/signer directement dans Storage | Ancien état historique | Fermé en TEST uniquement pour le scope message; passerelle privée obligatoire |
| Valider un PNG | Métadonnées serveur | Structure/CRC/décompression bornée des octets; attestation serveur avant rattachement |
| Fabriquer une attestation | Table/RPC encore absentes | Aucun utilisateur ne le peut; seul service_role inspecteur, accès courant vérifié |
| Autres modules/buckets | Inchangés | Inchangés, aucune nouvelle policy permissive |

La colonne historique « après activation préparée » décrit la conception avant installation; l’état courant est bien activé sur TEST. Le client B existant est resté intact. Un unique Employé B dédié à la recette, son membership, son chantier et sa conversation ont été provisionnés sur TEST; ils certifient l’isolation bidirectionnelle sans élargir les droits du client. Les liens déjà émis/copies déjà délivrées demandent un traitement séparé; aucun contrôle SQL ne peut effacer un fichier déjà reçu.

| Opération | Employé | Chef | Adjointe | Boss | Admin technique |
|---|---|---|---|---|---|
| Lire/écrire une conversation privée existante | Participant actif | Participant actif | Participant actif | Participant actif | Participant actif |
| Initier une conversation privée | Règles existantes `mir_conversation_private` | Idem | Idem | Idem | Idem, sans assimiler `admin` à `boss` |
| Lire/écrire une équipe | Appartenance active actuelle | Appartenance active actuelle | Appartenance active actuelle | Appartenance active actuelle | Appartenance active actuelle |
| Lire/créer la conversation officielle chantier | `job_dossier_allowed` | `job_dossier_allowed` | `job_dossier_allowed` | `job_dossier_allowed` | `job_dossier_allowed` |
| Écrire dans chantier archivé | Non | Non | Non | Non | Non |
| Lire historique chantier archivé | Si accès actuel | Si accès actuel | Si accès actuel | Si accès actuel | Si accès actuel |
| Rechercher / paginer / ouvrir fichier | Dans ses conversations autorisées uniquement | Idem | Idem | Idem | Idem |
| Rattacher un fichier | Objet existant, propriétaire soi-même, conversation et tenant exacts | Idem | Idem | Idem | Idem |
| Accuser lecture/réception | Pour soi uniquement | Idem | Idem | Idem | Idem |
| Lire/écrire les tables directement | Non | Non | Non | Non | Non depuis une session utilisateur |

Chaque opération exige `auth.uid()` et une membership interne active dans l’organisation ciblée. Les autres tenants sont toujours refusés, y compris pour Admin. Un identifiant reçu du navigateur n’est jamais une autorisation.

Initiation privée (règles historiques conservées, jamais vers soi-même) :

| Initiateur | Cibles autorisées |
|---|---|
| Employé | Adjointe, Boss; Employé/Chef partageant une équipe active |
| Chef | Boss; Employé/Chef partageant une équipe active |
| Adjointe | Employé et Chef |
| Boss | Tout autre membre ayant un rôle staff actif dans son organisation |
| Admin technique | Aucune nouvelle conversation privée via cette RPC historique; il peut répondre dans celles dont il est déjà participant |

Ces restrictions parfois asymétriques sont intentionnellement conservées : Phase 3A ne réinvente pas la matrice métier. Le test SQL essaie réellement les 25 paires des cinq rôles avec des identités fictives distinctes.

`job_dossier_allowed` conserve les droits Boss/Adjointe/Admin existants et les affectations chantier Employé/Chef. Entrepôt conserve le périmètre logistique déjà accordé par cette fonction; aucun nouveau droit hors clavardage. Le libellé opérationnel Boss pour Admin ne modifie pas le rôle technique.

Les participants historiques ne déterminent l’accès que pour les conversations privées. Les équipes et chantiers sont recalculés à chaque appel. Retrait = refus immédiat des nouvelles requêtes SQL et Storage non cachées; réintégration = accès rétabli. **Une réponse HTTP authentifiée déjà mise en cache peut encore être délivrée : échec de révocation immédiate constaté, non résolu.** Une URL déjà signée peut survivre jusqu’à son expiration (300 secondes par défaut client, pas un plafond SQL universel); ce délai n’est pas une révocation instantanée d’URL.

Certification : les 38 contrôles de la passerelle sont hébergés et réels au SHA `74d805179270a2aec86bebf7168b8444a6e4ff02`. La recette bidirectionnelle tenant B réussit 10/10 contrôles réels au SHA `be90c35bb41def96a91cf90503b5c0b430d5369f`, run `43067261753`. Les contrôles locaux/simulés restent distincts. Verdict Phase 3A sur MIR TEST : **CERTIFIÉ**.

## Reprise réelle autorisée — état courant

Correctifs TEST enregistrés : `20261111125722` (helper Support durci avant grant minimal) et `20261111130350` (sonde Storage séparée des métadonnées finales). Les trois policies Support et les fonctions métier sous-jacentes sont conservées, sans grant utilisateur aux helpers internes. Aucun droit de table chat ajouté.

Les six comptes existants ont réellement passé [49 contrôles chat en Actions](https://github.com/revetementsmir/Revetements-mir-/actions/runs/43026678667). Employé, Chef, Adjointe, Boss et Admin : lecture chantier 200; Entrepôt non relié à une opération : 403. Chaque rôle est refusé dans la deuxième organisation existante. La certification générale des six rôles est également verte après application.

Retraits et réintégrations équipe/chantier vérifiés avec les comptes locaux existants : RPC refusée immédiatement, réintégration autorisée, conversations privées et historique préservés. PNG et refus de fichiers, pagination/recherche, concurrence d’envoi, reçus/non-lus et expiration réelle à 5 et 300 secondes vérifiés. Voir le [rapport](mir-chat-phase3a-security.md) et le [JSON détaillé](mir-chat-phase3a-storage-recertification.json).

**Certification intégrale non acquise** : réponse authentifiée déjà cachée encore 200 après retrait (non cachée 400); seconde organisation sans membre interne actif pour une validation positive B → A; validation MIME limitée aux métadonnées, texte non PNG déclaré PNG accepté. Aucun réglage partagé, compte ou membership ajouté pour masquer ces limites. La matrice reste normative, pas une garantie des copies déjà délivrées.

## Historique — première recette réelle, avant les correctifs

Migration `chat_phase3a_security` enregistrée sur MIR TEST en version `20261111122840`. Chef, Employé et Admin technique : lectures HTTP du chantier de recette autorisées; refus HTTP sur une seconde organisation existante. Client exclu. **Boss et Adjointe : nouvelles RPC non certifiées par session réelle après migration.** Les secrets existants ne sont pas demandés dans le clavardage.

Le PNG légitime est refusé par HTTP Storage avec `permission denied for function support_object_allowed`. Les retraits/réintégrations, non-lus, messages concurrents, téléchargements et expiration des URL restent non exécutés en hébergé. La matrice attendue ci-dessus n’est donc pas intégralement certifiée. Voir le [rapport courant](mir-chat-phase3a-security.md) et le [JSON réel](mir-chat-phase3a-mir-test-results.json).
