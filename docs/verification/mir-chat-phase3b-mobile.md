# MIR — Phase 3B : clavardage mobile

## État courant

Verdict : **PARTIELLEMENT VALIDÉ** sur la branche `codex/phase-3b-clavardage-mobile`, dépendante de la tête 3A certifiée `f5c2aa04450d708a8f86da51bc3c778d0ebf75e7`. La PR 3A n’étant pas fusionnée au démarrage, 3B ne repart pas d’un `main` incomplet.

Le backend 3A n’a pas été migré, redéployé ni recertifié. Ses preuves restent : 38/38 contrôles passerelle au SHA `74d805179270a2aec86bebf7168b8444a6e4ff02`, puis 10/10 contrôles d’isolation A↔B au SHA `be90c35bb41def96a91cf90503b5c0b430d5369f`.

## Parcours réalisé

- Liste Harmony des conversations privées, d’équipe et de chantier, avec type, non-lus et chargement des pages suivantes.
- Recherche serveur par `mir_chat_search`; un résultat réouvre la conversation par le même parcours autorisé et accuse uniquement ses propres reçus.
- Fil responsive : plein écran sur téléphone; liste et conversation côte à côte sur tablette et ordinateur.
- Messages paginés et dédupliqués, historique ancien chargé au-dessus, chantier archivé en lecture seule.
- Photos ouvertes et téléversées exclusivement par `mir-chat-files`; aucun repli vers une URL Storage chat.
- Brouillon par utilisateur et conversation conservé localement; il est supprimé seulement après confirmation d’envoi.
- État hors ligne visible et envoi désactivé; retour en ligne sans perdre le brouillon.
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

### Réel hébergé réutilisé, non rejoué

- 3A passerelle : 38/38, run GitHub `43052372399`.
- 3A isolation tenant : 10/10, run GitHub `43067261753`.
- Aucun test 3B hébergé et aucune publication du frontend : la branche reste une proposition en PR brouillon.

### Local et simulé

- UI Playwright : 6/6 formats — 360×800, 390×844, 430×932, 768×1024, 1024×768, 1440×900.
- Chaque format vérifie recherche, pagination, ordre/dédoublonnage, brouillon, hors ligne, envoi unique, reçu propre, archive, refus d’accès et non-régression Aujourd’hui.
- Contrats client 3A : 7/7.
- Validateur/passerelle : 8/8.
- Aujourd’hui et modules protégés : 7/7.
- Six rôles et refus sensibles : 7/7.
- Syntaxe JavaScript et `git diff --check` réussis.

Ces résultats navigateur utilisent des comptes, RPC et réponses simulés. Ils prouvent le comportement UI, pas une installation hébergée du frontend.

## Limites et décision nécessaire

Le backend 3A certifié accepte actuellement JPG, PNG, WebP, HEIC et HEIF. Il ne prend pas en charge les PDF ou documents génériques dans `mir-chat-files`. L’interface le signale et n’offre pas un faux parcours positif. Ajouter les documents demanderait une extension serveur bornée, ses validations binaires, une installation TEST et une certification distincte; rien de cela n’est réalisé silencieusement dans cette consolidation frontend.

Les copies déjà téléchargées ne sont pas révocables à distance. Le HTTP 500 historique de la route Storage native demeure distinct et n’est pas présenté comme corrigé par 3B.

SEO/GEO : non applicable. Le clavardage est une surface interne authentifiée; aucune URL, indexation, accès public ou contenu commercial n’est modifié.

Production intacte. Aucun merge, publication, Phase 3C ou refonte publique.
