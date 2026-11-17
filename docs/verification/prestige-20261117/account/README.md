# Compte client et aide — refonte prestige

Base vérifiée : `e9bd39bc5dd4c40663c56bfc21759c543ab4e8d9`. Travail sur `codex/client-prestige-20261117`, sans production.

## Écrans

Connexion, inscription (création toujours désactivée selon la configuration existante), aperçu du compte, commandes vides, formulaires d’adresse existants et aide publique. La présentation réutilise les formulaires, validations, états et données du compte; aucun adaptateur Auth ni accès serveur n’a été modifié.

L’aide publique `aide.html` reprend les quatre réponses de base du centre d’aide existant, ajoute les repères sur les pliages et le panier, propose une recherche locale et les liens directs vers les pages utiles. Aucun compte requis et aucun formulaire de contact simulant un envoi.

## Vérifications réelles

- Chromium 1440 × 1000, 834 × 1112 et 390 × 844 : connexion, inscription, compte et commandes en français et anglais; aucune erreur JavaScript ni débordement horizontal.
- Connexion invalide puis connexion/déconnexion avec SDK simulé : panier local conservé. Aucun appel au serveur Auth; toutes les requêtes externes sont bloquées et les fichiers sont servis depuis le dépôt.
- Bouton de création de compte toujours désactivé; Google reste désactivé. Aucun courriel ni inscription envoyé.
- Aide FR/EN aux trois formats : recherche, réponse unique, état sans résultat, détails et liens visibles.
- Captures `before-*` rendues depuis le SHA de base; `after-*` rendues depuis les fichiers modifiés. Les captures de compte connecté représentent une fixture vide, pas un vrai client.
- Isolation : lien employé sans `clientLocale`, rôle employé simulé et invitation, vérifiés par `guards.cjs`; détails dans `guards.json`.

## Reproduction

Les scripts `capture.cjs` (argument `before` ou `after`), `bilingual.cjs`, `help.cjs` et `guards.cjs` utilisent Chromium/Playwright et le SDK simulé du test existant `tests/mir-account-browser.cjs`. Ils interceptent l’origine MIR autorisée et n’utilisent aucun backend.

## Limites

Les appareils sont émulés sous Chromium; aucun essai appareil physique ou Safari. Le compte existant propose les commandes/adresses et le centre de soutien; un historique client distinct des estimations n’a pas été inventé. Les comptes réels, l’envoi des courriels et les permissions serveur ne sont pas certifiés par ces essais visuels.
