# MIR — Phase 3B : clavardage mobile

## État courant

Verdict : **CERTIFIÉ sur MIR TEST en recette intégrée privée** au SHA fonctionnel `b6296c0fa9ac86e11fa08e9d2c94f553892adc2f`, sur la branche `codex/phase-3b-clavardage-mobile`, dépendante de la tête 3A certifiée `f5c2aa04450d708a8f86da51bc3c778d0ebf75e7`. La PR 3A n’étant pas fusionnée au démarrage, 3B ne repart pas d’un `main` incomplet.

Les preuves 3A sont réutilisées sans rejouer leur certification complète : 38/38 contrôles passerelle au SHA `74d805179270a2aec86bebf7168b8444a6e4ff02`, puis 10/10 contrôles d’isolation A↔B au SHA `be90c35bb41def96a91cf90503b5c0b430d5369f`.

Extension PDF installée uniquement sur MIR TEST le 11 novembre 2026 : migrations `chat_phase3b_pdf_attachments`, `chat_phase3b_pdf_gateway_acl` et `chat_phase3b_pdf_attestation_constraint`, `mir-chat-files` v2 et recette isolée `mir-chat-tenant-b-recipe` v3. Le bucket `mir-internal` demeure privé et limité à 10 MiB; seul `application/pdf` a été ajouté aux cinq MIME image. La fonction conserve `verify_jwt=false` uniquement avec la vérification Auth explicite. Les migrations étendent au PDF l’attestation binaire service-only, la contrainte d’inspecteur et la validation objet existantes, sans élargir les ACL utilisateur ni les autorisations de conversation.

## Parcours réalisé

- Liste Harmony des conversations privées, d’équipe et de chantier, avec type, non-lus et chargement des pages suivantes.
- Recherche serveur par `mir_chat_search`; un résultat réouvre la conversation par le même parcours autorisé et accuse uniquement ses propres reçus.
- Fil responsive : plein écran sur téléphone; liste et conversation côte à côte sur tablette et ordinateur.
- Messages paginés et dédupliqués, historique ancien chargé au-dessus, chantier archivé en lecture seule.
- Photos et PDF ouverts et téléversés exclusivement par `mir-chat-files`; aucun repli vers une URL Storage chat.
- PDF bornés à 10 MiB : en-tête/version, fin `%%EOF`, `startxref`, cible xref, catalogue/pages et nombre d’objets contrôlés. PDF chiffrés, scripts, actions de lancement et fichiers incorporés refusés par ce profil passif.
- Brouillon par utilisateur et conversation conservé localement; il est supprimé seulement après confirmation d’envoi.
- État hors ligne visible et envoi désactivé; retour en ligne sans perdre le brouillon texte. Un fichier sélectionné doit être choisi de nouveau après rechargement et une pièce non téléchargée ne peut pas être ouverte hors ligne.
- Verrou d’envoi en mémoire et contrôle d’opération existant : un double clic ne produit qu’une commande.
- États chargement, vide, erreur avec nouvel essai, hors ligne et accès refusé/lecture seule.

## Proposition visuelle précoce

L’aperçu autonome `docs/verification/mir-chat-phase3b-proposal.html` utilise uniquement des données fictives, aucun compte, API, stockage ou service worker. Il a été produit avant la généralisation fonctionnelle pour fixer le parcours liste → conversation → pièce jointe.

Captures fonctionnelles simulées :

- `docs/verification/captures/chat-phase3b/chat-390x844.png`
- `docs/verification/captures/chat-phase3b/chat-768x1024.png`
- `docs/verification/captures/chat-phase3b/chat-1024x768.png`
- `docs/verification/captures/chat-phase3b/chat-1440x900.png`

## Vérifications exécutées

### Réel hébergé

- 3A passerelle : 38/38, run GitHub `43052372399`.
- 3A isolation tenant : 10/10, run GitHub `43067261753`.
- Extension installée sur MIR TEST : `mir-chat-files` v2, `mir-chat-tenant-b-recipe` v3 et migrations `chat_phase3b_pdf_attachments`, `chat_phase3b_pdf_gateway_acl`, `chat_phase3b_pdf_attestation_constraint`.
- La recette locale a détecté avant validation hébergée que la contrainte d’inspecteur 3A restait limitée aux images; la troisième migration l’étend exactement à `pdf-structure-v1`, sans modifier les ACL.
- Recette ciblée 3B hébergée au SHA `9eed4435681ee1a44223d42665ccd8fb742ae081` : **25/25 réussis**, run GitHub `43084321137`, artefact `mir-chat-phase3b-real` (digest `sha256:bdf7a5fb3b8c1baa5972ed43e95c33f518a25a30598c9dbe453dbd99948ea170`). Photo et PDF réels, trois PDF invalides refusés, idempotence, pagination, recherche, non-lus, retrait/réintégration et refus Storage direct sont prouvés.
- Le même job a réussi l’étape réelle d’isolation A→B et B→A pour photo et PDF avec la recette tenant B existante. Les affectations temporaires A ont été restaurées; aucun secret n’est présent dans l’artefact.
- Recette frontend intégrée privée sur le SHA exact `b6296c0fa9ac86e11fa08e9d2c94f553892adc2f` : **22/22 contrôles réussis** avec deux sessions Auth réelles, fichiers de la branche servis sous l’origine HTTPS MIR courante et appels métier dirigés uniquement vers MIR TEST. Conversations, recherche, pagination 20→40, PNG/PDF envoyés et ouverts par `mir-chat-files`, non-lu, reçu de lecture, brouillon hors ligne et envoi unique sont prouvés.
- Après retrait réel du chantier, une nouvelle lecture du fichier par la session navigateur reçoit **403**; les affectations temporaires sont ensuite restaurées. Les formats 390×844, 768×1024 et 1440×900 ne présentent aucun débordement horizontal.
- Preuve expurgée : `docs/verification/mir-chat-phase3b-browser-real-results.json`. Aucun secret, jeton ou donnée Auth n’y est consigné.
- Aucune publication du frontend : la branche reste une proposition en PR brouillon.

### Local et simulé

- UI Playwright : 6/6 formats — 360×800, 390×844, 430×932, 768×1024, 1024×768, 1440×900.
- Chaque format vérifie recherche, pagination, ordre/dédoublonnage, brouillon, choix PDF, limite hors ligne explicite, envoi unique, reçu propre, archive, refus d’accès et non-régression Aujourd’hui.
- Contrats client 3A : 7/7.
- Validateur/passerelle : 10/10, incluant PDF valide, faux PDF, PDF tronqué, contenu actif et taille excessive.
- Aujourd’hui et modules protégés : 7/7.
- Six rôles et refus sensibles : 7/7.
- Syntaxe JavaScript et `git diff --check` réussis.

Ces résultats navigateur utilisent des comptes, RPC et réponses simulés. Ils prouvent le comportement UI, pas une installation hébergée du frontend.

## Limites conservées

La recette intégrée demandée est certifiée sur MIR TEST. Elle utilise Chromium privé et des dimensions de viewport; elle ne constitue pas une recette sur appareils physiques. Le frontend n’est pas publié, conformément au périmètre, et les documents autres que les images autorisées et le PDF restent refusés.

Les copies déjà téléchargées ne sont pas révocables à distance. Le HTTP 500 historique de la route Storage native demeure distinct et n’est pas présenté comme corrigé par 3B.

SEO/GEO : non applicable. Le clavardage est une surface interne authentifiée; aucune URL, indexation, accès public ou contenu commercial n’est modifié.

Production intacte. Aucun merge, publication, Phase 3C ou refonte publique.
