# Socle partagé MIR — étape 1

Branche : `codex/shared-data-security-foundation`, référence initiale main `02493d0517899f5fa1bfdbde0e96129989229a33`.

## Ce qui est implanté

- Migration PostgreSQL additive dans le schéma isolé `mir_core`, sans changer les tables ni les RPC existants. Comptes reliés à `auth.users`, membres Admin/employé/client, modèles et versions, mesures/matériaux/couleurs en instantanés JSONB, prix en cents CAD, catalogues Boutique/Magasin, fournisseurs, commandes, pièces, révisions, événements, métadonnées PDF et journal/file des envois.
- Politiques RLS sur toutes les tables, droits SQL explicites et fonctions serveur dont le `search_path` est fixé. L'identité vient de `auth.uid()`; les droits sont relus dans les adhésions actives, sans confiance dans un rôle envoyé par le navigateur. Employés : articles Magasin publiés et leurs propres demandes; clients : articles Boutique publiés et leurs propres commandes; Admin : données de son organisation. Aucun accès anonyme à ce schéma. Le catalogue public existant reste inchangé.
- Aucun droit navigateur pour modifier les adhésions, supprimer les historiques, modifier des versions déjà enregistrées, écrire dans la file d'envoi ou fabriquer une confirmation de transmission. La création du premier Admin et la gestion des rôles nécessitent encore un service de provisionnement contrôlé. « Admin complet » n'autorise pas à falsifier ou effacer un historique.
- Une ligne de commande peut conserver son dessin et sa configuration sans référence à un modèle enregistré (`model_id` nullable). Les clés étrangères composites empêchent de mélanger des organisations et des révisions de PDF.
- Sauvegarde exacte et validation des sept clés locales recensées dans les parcours de production : modèles, demandes, dossiers Admin/employé/client, achats et anciens bons Admin. Empreinte SHA-256, comparaison sans écrasement, mise en quarantaine serveur dédupliquée et annulation du staging conservant la sauvegarde. Aucun import dans les tables métier à cette étape.
- Contraintes de dédoublonnage d'envoi par bon/révision/opération et identifiant de requête; une tentative acceptée doit porter un identifiant prestataire. Aucun travailleur, prestataire, déclencheur réseau ou courriel réel installé.

## Préservation et migration

`dist/mir-local-backup.js` est un outil volontaire, **non chargé dans les pages publiques**. Il ne contient aucun appel `setItem`/`removeItem`. `capture(localStorage)` retourne les chaînes originales sans les réécrire; `validate` refuse les structures inconnues et les identifiants dupliqués. `checksum` calcule une empreinte navigateur. `reconcile` retourne unchanged/missing/conflict sans agir sur les données.

Exporter cette sauvegarde vers un emplacement privé avant toute future importation. Elle contient des données métier et ne doit pas être committée dans Git. Les autres clés locales, notamment les prototypes d'atelier et le stockage d'authentification, sont exclues de cet outil; les inventorier et développer leurs validateurs avant migration. Les archives anciennes non conformes sont signalées, jamais normalisées silencieusement ni supprimées.

Le serveur `stage_local_backup(org,payload)` revalide les clés et les formats, vérifie un Admin actif, conserve le contenu et calcule son propre SHA-256 sur les entrées ordonnées. Cette empreinte SQL n'est pas le même encodage que l'empreinte navigateur : elles ne sont pas comparées entre elles. La date de création du fichier ne change pas l'identité d'un lot. Deux captures identiques retournent le même identifiant; un même identifiant local avec un contenu différent entre deux captures reste conservé dans deux lots, en attente de rapprochement humain. Ne pas confondre dédoublonnage des sauvegardes et import métier complet.

`revert_staged_backup(org,batch)` marque uniquement le lot reverted. Le contenu sauvegardé et les données locales restent intacts. Aucun bouton ni bascule ne remplace encore la source locale par la base partagée. La migration métier suivante devra utiliser une table de correspondance des identifiants, un aperçu, des transactions, un rapprochement et un rapport des conflits, puis un retour arrière documenté.

## Validation locale reproductible

Pré-requis : Node 24, Python 3 pour les recettes existantes, Playwright et Chromium pour les tests navigateur.

```sh
cd tools/database
npm ci --ignore-scripts --no-audit --no-fund
cd ../..
node tests/mir-database.cjs
node tests/mir-local-backup.cjs
node tests/mir-local-backup-browser.cjs
node tools/run-chromium-test.cjs tests/mir-direct-po-browser.cjs
node tools/run-chromium-test.cjs tests/mir-atelier-v4-browser.cjs
node tools/run-chromium-test.cjs tests/mir-homepage-browser.cjs
```

Le moteur de test PGlite exécute réellement PostgreSQL et les politiques RLS. Les tests créent uniquement en mémoire les rôles anon/authenticated et le contrat minimal auth.users/auth.uid. Ils ne prouvent pas le bon paramétrage d'une instance Supabase distante, de son JWT, de son Auth ou de son Storage. Les tests doivent produire leurs résultats individuels, pas simplement une sortie « zéro test ». La CI exécute directement les scripts Node pour conserver leur compte rendu.

Le lanceur Chromium remplace uniquement le choix de binaire des tests historiques qui imposent le canal Google Chrome. Il conserve leurs assertions et leur application. Les résultats obtenus sont des recettes **Chromium**, pas une certification de Google Chrome. Les captures sont dans artifacts/ (ignoré par Git).

## Avant tout déploiement, distinct de cette livraison

1. Inventorier les tables, migrations, utilisateurs et RPC du Supabase existant; sauvegarder et vérifier la restauration. Ne pas appliquer cette migration si un schéma `mir_core` existe déjà : elle doit échouer plutôt que remplacer ce schéma.
2. Répéter la migration dans une préproduction autorisée. Vérifier les permissions avec de vrais comptes, y compris l'absence de données d'une autre organisation. Ne jamais placer de clé privilégiée dans `dist/`.
3. Créer le premier Admin par un canal serveur contrôlé. Développer provisionnement, invitations, MFA Admin et journalisation avant d'activer les options de `portal-config.js`.
4. Le schéma n'est pas automatiquement exposé par PostgREST; le helper Supabase `.schema('mir_core')` ne peut fonctionner à distance qu'après configuration autorisée d'un schéma exposé ou ajout d'une façade API compatible. Aucun changement d'infrastructure réalisé ici.
5. Les RPC existants attendus par `portal-client.js` ne sont pas remplacés : `mir_portal_snapshot`, `mir_portal_command`, acceptation/liste des invitations, `mir-invitations`, `mir-plans` restent à intégrer. L'accès employé en écriture exige aussi les affectations chantier et transactions métier de la phase suivante.
6. Préparer les fonctions transactionnelles d'approbation et de révision : les écritures SQL Admin sont des primitives de fondation, pas encore un workflow complet d'approbation avec verrouillage de version. Réserver les instantanés contenant des informations sensibles aux bonnes audiences.
7. Créer les buckets privés et leurs règles après autorisation : une métadonnée `documents` ne protège pas à elle seule un objet Storage. Ajouter PDF serveur depuis une révision approuvée, validation du destinataire fournisseur, rendu sans ressources distantes arbitraires et SHA-256.
8. Développer un travailleur d'envoi avec bail, reprises et rapprochement prestataire, puis webhooks signés. Une unicité SQL ne garantit pas à elle seule un seul courriel après un crash réseau. Utiliser uniquement un prestataire/une boîte de test jusqu'à autorisation d'envoi externe. Distinguer accepted, delivered et accusé humain; l'adaptateur candidat actuel exige une preuve immédiate, donc ajouter un contrat queued distinct.

Ne pas activer le portail, faire une bascule de données, appliquer la migration à la production ou envoyer un courriel avec cette seule livraison. L'accueil, les parcours client/Admin, le pliage, la 3D sur demande et les données locales actuelles n'ont pas été changés.
