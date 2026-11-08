# Mon compte MIR — recette et livraison

Travail sur le dépôt existant, branche `feat/mir-account-auth`, à partir du main réel `3d09df0ae5184db89723faf4a39c2e307f6eb055` (PR51 + PR55 + ajouts CanExel conservés). Autorisation utilisateur : « Nah active prod direct », puis « Autorise tout automatique ». Publication après tests et inspection ; aucune commande envoyée automatiquement.

## Réalisé

- Une page `chantier.html` : Google, courriel/mot de passe, visibilité du mot de passe, inscription client avec confirmation, récupération, invitation et déconnexion. Même en-tête Harmony et logo original.
- Retour Google, confirmation, invitation et récupération distingués. Un lien expiré masque le compte ; une invitation refusée permet de revenir à Mon compte sans rester bloqué. La récupération impose le nouveau mot de passe avant le compte, y compris après rechargement. Codes et jetons retirés de l'URL. Aucun rôle déduit des données du navigateur.
- Catalogue et sélection accessibles sans compte. Le panier reste dans ses stockages existants ; seul un retour constant et expirant est mémorisé. Retour à la vérification, sans création automatique de commande.
- Commandes du client et suivi filtrés côté serveur ; adresses privées protégées par RLS et RPC. L'inscription publique donne uniquement le rôle client dans l'organisation choisie par le serveur.
- Invitation employé créée par un administrateur : lien privé à transmettre explicitement, 72 h, jeton aléatoire stocké seulement sous forme de hash, identité/courriel confirmés, attribution des seuls chantiers autorisés. Aucun envoi de courriel automatique. Connexion Entrepôt et son stockage Auth préservés.
- Adaptateur du portail employé : affectations vérifiées présentes dans les dossiers ; demandes du catalogue partagé conservées séparément, sans inventer de livraisons ni de reliquats. Les anciennes actions sans backend répondent par un refus définitif et explicite, sans commande ni stock modifié.
- Deux migrations additives installées sur MIR TEST puis MIR. Aucun remplacement des données métier, des moteurs de calcul ou du PDF fournisseur.

## Preuves

- `browser.log` : vrais écrans Chromium sur 360/390/428/820/1024/1440/2560 px ; transport SDK simulé pour les scénarios confirmation/Google/récupération/invitations. Connexion, erreurs, adresses, déconnexion, absence de débordement, champs >=44 px, panier inchangé et absence de commande automatique.
- `real-auth.json` / `real-auth.log` : SDK fourni par le site et HTTPS Supabase réels, trois rôles existants. Identité vérifiée, rôle serveur, refus du portail équipe pour le client, chantiers attribués et déconnexion. Les identifiants techniques de recette sont acceptés par Auth mais leurs courriels échouent à la syntaxe HTML : les sessions sont donc initiées par le SDK, puis l'interface réelle est rechargée. Le formulaire normal est testé séparément avec des courriels valides simulés.
- `employee-regression.log` : parcours employé existant sur six largeurs, envoi simulé uniquement.
- `session.log` : changement d’identité et réponse tardive après déconnexion ; aucune donnée du premier client n’est rendue au second.
- `contract.log` : configuration publique isolée MIR/MIR TEST, retours fixes, nettoyage des secrets, contrats des pages publiques et sessions existantes.
- `supabase/verification/mir-account-acceptance.sql` : exécuté sur MIR TEST, transaction entièrement annulée. Deux clients, commandes/adresses privées, RLS, refus client/admin/anon, invitation de la bonne identité, refus de la mauvaise identité, affectation unique et répétition idempotente. Résultat PASS après la seconde migration.
- `auth-settings.json` : réglages publics réels Google=true, disableSignup=false, confirmation du courriel conservée.
- Captures `avant-*.png`, `connexion-*.png`, `adresses-*.png` : vrais navigateurs, inspection des formats téléphone, tablette et PC. Les données visibles sont fictives.
- Correction de synchronisation du test de viewport : attendre la mise à jour de visualViewport avant de mesurer la barre, comme pour le scénario clavier. Les assertions de non-défilement et de visibilité restent identiques ; aucun test désactivé.
- En-têtes publics : 30 contrôles navigateur réussis. Les preuves des ateliers et le véritable PDF de dix panneaux restent dans `../fixed-workspace/`.

## Limites et dépendances explicites

Le paiement et la transformation de la sélection boutique en commande commerciale ne sont pas encore raccordés dans la base existante. Le site l'indique et conserve PDF/liste ; ce développement n'invente ni paiement ni commande. Les anciennes commandes de matériel/inventaire du portail n'avaient pas de RPC installée ; elles restent présentes mais refusent clairement une écriture non raccordée. Les demandes du catalogue partagé et le parcours Entrepôt existant restent distincts.

Le départ réel vers Google retourne HTTP 302 vers accounts.google.com ; le consentement humain, le retour final Google, l'autorisation des URL dans le tableau de bord et la livraison réelle des courriels de confirmation/récupération nécessitent la recette propriétaire. Aucun test automatisé ne prouve la réception dans une boîte courriel. Aucun mot de passe réel n'a été changé par la recette.

Chromium Linux en émulation ne prouve pas le fonctionnement physique iPad/Safari. Voir protocole ci-dessous. Le serveur conserve ses alertes existantes de protection contre les mots de passe compromis désactivée et d'anciennes fonctions definer ; aucune permission existante n'est modifiée hors besoin du compte. Les nouvelles tables privées sont volontairement sans accès direct ; les fonctions exposées vérifient identité et droits.

## Transmission à Work / recette réelle

- Préproduction isolée (même site existant, backend MIR TEST) : `https://revetementsmirweb.github.io/MIR/chantier.html?recette=1`. Disponible après publication du SHA de cette PR. Google et nouvelles inscriptions y sont volontairement désactivés ; utiliser les comptes de test autorisés. Aucun nouveau site.
- Production : `https://revetementsmirweb.github.io/MIR/chantier.html`.
- Retour principal : `https://revetementsmirweb.github.io/MIR/chantier.html`.
- Retours exacts : `https://revetementsmirweb.github.io/MIR/chantier.html?flow=google`, `https://revetementsmirweb.github.io/MIR/chantier.html?flow=signup`, `https://revetementsmirweb.github.io/MIR/chantier.html?flow=recovery`, `https://revetementsmirweb.github.io/MIR/chantier.html?flow=invite`.
- Variantes MIR TEST : mêmes URL avec `&recette=1`.
- Callback Google du fournisseur : `https://gccltmaulvrnthrbnrpd.supabase.co/auth/v1/callback`.
- Tableau des URL autorisées : `https://supabase.com/dashboard/project/gccltmaulvrnthrbnrpd/auth/url-configuration`.
- SHA : voir le commit de la PR et `git rev-parse HEAD` ; aucun secret dans ce dossier.

Recette humaine : ajouter des articles sans compte ; ouvrir la commande ; créer un client réel avec courriel de test consenti ; recevoir/confirmer ; retrouver exactement le panier sans soumission ; se déconnecter ; se connecter avec Google et revenir à la sélection ; récupérer le mot de passe et vérifier que le formulaire précède le compte ; utiliser un lien expiré ; comparer deux clients ; essayer une invitation valide puis la mauvaise identité ; vérifier uniquement les chantiers attribués. Sur iPad Safari réel portrait/paysage et Android réel, tester clavier, focus, texte agrandi, menu, mot de passe visible et déconnexion. Aucun envoi de commande réelle dans cette recette.
