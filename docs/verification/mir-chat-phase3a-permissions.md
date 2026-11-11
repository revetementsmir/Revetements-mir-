# Clavardage Phase 3A — matrice de sécurité

Base : `39de53260a134bae48143c1bdb1aa235335d6187`. Rôles et autorisations chantier existants réutilisés, aucun nouveau rôle.

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

Les participants historiques ne déterminent l’accès que pour les conversations privées. Les équipes et chantiers sont recalculés à chaque appel. Retrait = refus immédiat des nouvelles requêtes SQL/Storage, réintégration = accès rétabli. Une URL déjà signée peut survivre jusqu’à son expiration (300 secondes); ce délai n’est pas une révocation instantanée d’URL.

Certification : aucun test local n’équivaut à une certification hébergée.

## Recette réelle du 11 novembre 2026 — partielle et bloquée

Migration `chat_phase3a_security` enregistrée sur MIR TEST en version `20261111122840`. Chef, Employé et Admin technique : lectures HTTP du chantier de recette autorisées; refus HTTP sur une seconde organisation existante. Client exclu. **Boss et Adjointe : nouvelles RPC non certifiées par session réelle après migration.** Les secrets existants ne sont pas demandés dans le clavardage.

Le PNG légitime est refusé par HTTP Storage avec `permission denied for function support_object_allowed`. Les retraits/réintégrations, non-lus, messages concurrents, téléchargements et expiration des URL restent non exécutés en hébergé. La matrice attendue ci-dessus n’est donc pas intégralement certifiée. Voir le [rapport courant](mir-chat-phase3a-security.md) et le [JSON réel](mir-chat-phase3a-mir-test-results.json).
