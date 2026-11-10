# Écart Prompt 1 — Finaliser et certifier MIR

État local vérifié sur `work` au commit `59b2542c934fe7140cce3e6cc0f8a9602b58ead9`.
La base `56a979bb58a365ea52789f91a8350742b32da8b3` est un ancêtre et six commits sont
présents au-dessus. Aucun push ou déploiement n'a été effectué pendant cette reprise.

## Réalisé localement

- contrat API de certification de six comptes réels;
- échec explicite si un secret manque, sans `SKIP`;
- six identités distinctes exigées;
- Auth et rafraîchissement de session;
- vérification de l'identité `mir_account_snapshot` et `mir_portal_snapshot`;
- organisation MIR TEST et rôle opérationnel;
- RPC autorisées et refusées selon le rôle;
- isolation contre une organisation étrangère;
- rapport expurgé de courriels, mots de passe et jetons;
- job CI séparant clairement `UI simulated` et certification réelle;
- exécution CI prévue des contrats PGlite et des parcours Chrome pertinents;
- documentation des secrets et des limites de preuve.

## Tests locaux réussis

- contrat de la nouvelle certification : 5 scénarios;
- punch PGlite : 16 scénarios;
- gestion PGlite : 7 scénarios;
- véhicules et entrepôt PGlite : 15 scénarios;
- validation réelle/configuration : 4 scénarios;
- sessions : 2 scénarios;
- navigation et contrats des rôles;
- syntaxe Node, YAML et `git diff --check`.

## Bloqué jusqu'à disponibilité de l'environnement

- exécution des six authentifications réelles : secrets GitHub non injectés localement;
- validation navigateur locale : Chromium est installé, mais le sandbox refuse la création
  du socket de processus (`Operation not permitted`);
- essai sur appareils physiques : aucune ferme d'appareils n'est attachée;
- contrôle de branche obligatoire : à activer dans les paramètres GitHub après réussite du workflow.
- protection contre les mots de passe compromis : à vérifier/activer dans Supabase Auth;
- revue des fonctions `SECURITY DEFINER` exécutables par `authenticated` : exige l'advisor et les
  droits du projet hébergé; aucune permission n'a été élargie localement;
- tables RLS volontairement sans policy : à confirmer une par une comme fermées par conception,
  sans créer automatiquement de policy permissive.
- sécurité QA historique : le script du commit certifié `ab808161` comparait une valeur de mot de
  passe de recette directement dans le code. La nouvelle recette ne contient plus cette valeur,
  mais le mot de passe QA partagé doit être renouvelé avant la prochaine exécution. La réécriture
  d'historique Git, si souhaitée, exige une décision séparée et ne doit jamais être faite implicitement.

Le workflow GitHub est configuré pour reprendre les tests navigateur sur un runner Ubuntu avec
Google Chrome. La certification n'est **pas** déclarée complète tant que le job à six comptes
n'a pas produit un rapport `PASS` et que les contrôles GitHub n'ont pas été vérifiés.

## Éléments encore à compléter après la première exécution réelle

- vérifier les pages d'arrivée et les URL directes dans une session navigateur réelle pour les six rôles;
- tester l'expiration de session et confirmer qu'un rafraîchissement n'élève jamais les privilèges;
- vérifier les fichiers privés `mir-internal` avec des objets de recette connus;
- confirmer l'isolation entre deux organisations MIR TEST distinctes si un second identifiant QA est fourni;
- réaliser la recette téléphone, tablette et ordinateur, puis archiver les captures.
- documenter explicitement la fonction publique de tarif `mir_public_bend_tariff` si son accès
  anonyme demeure intentionnel.
