# Audit renforcé des parcours APK — 13 novembre 2026

Demande de Frederick : uniquement les cinq comptes métier existants, aucun parcours client ni demande d’estimation publique. Même branche et PR31 brouillon; aucune diffusion. MOON1.3.11, méthodes Sécurité/Tests/Mobile appliquées dans le chat, sans intervenant autonome.

## Constats et corrections

- Les pages publiques estimation/boutique/studio étaient déjà exclues, mais la liste de routes acceptait `production.html?mode=client` et `?estimate=1`. Le moteur partagé pouvait ainsi ouvrir le configurateur public et son formulaire d’estimation, même avec l’envoi désactivé.
- Java et JavaScript refusent maintenant ces URL, y compris paramètres encodés et doublons ambigus. Exception précise : `production.html?mode=client&source=store&kind=profile`, outil de pliage du magasin Employé; son nom technique historique ne signifie pas compte client.
- Le chargement initial d’un document est également contrôlé dans la frontière native, pas seulement le clic sur un lien.
- Les trois modules estimation (interface, brouillons, téléversement) et leurs références HTML sont exclus du paquet. L’API d’estimation et son dialogue sont absents.
- Liens locaux interdits et déclencheurs d’estimation masqués dans toutes les pages, pas seulement l’en-tête. Les sites publics MIR connus ne s’ouvrent plus depuis l’application; cartes et documentation externe restent possibles.
- RPC réservés aux parcours `mir_client_*` et `mir_estimate_*` refusés par Java et JavaScript. Gestion métier `mir_management_*`, soutien métier et droits serveur existants conservés.
- FAQ native limitée à des instructions équipe, sans invitation à demander une estimation, ouvrir le panier client ou Nous joindre. Le soutien autorisé reste fourni par les méthodes existantes et leurs contrôles serveur.

## Comptes et limites

Employé chantier, Chef d’équipe, Entrepôt et livraison, Adjointe et Boss restent les seuls rôles métier. Le SDK valide le rôle serveur avant chaque RPC; Admin technique/client/inconnu refusés, données locales purgées aux changements de compte. `chantier-app` garde ses listes de vues autorisées par rôle; aucune permission ni liste serveur modifiée. Les soumissions/factures/dossiers clients gérés par Boss/Adjointe sont des outils métier existants, distincts de « Demander une estimation » côté client.

Contrôles locaux :19 contrats réussis, Chromium sept formats/cinq états de rôle simulés, vrai rendu du pliage magasin et de la FAQ métier, absence de l’API/dialogue d’estimation; PDF quatre pages/course intercomptes et diagnostic local réussis. Deux captures Chromium réellement ouvertes; elles ne sont pas des preuves Android. Simulation sans requête métier externe ni soumission.

Gradle local bloqué au téléchargement `services.gradle.org` (DNS); JDK de cette machine sans `javac`. Tests Java/Lint/compilation et matrice réelle doivent donc être vérifiés en CI sur le nouveau SHA. Les assertions Java et la matrice Android des cinq rôles sont renforcées; aucun test neutralisé.

Les APK04a5b43 et58c13ab restent historiques pour ce nouveau correctif : leurs empreintes ne certifient pas ce code. Générateur/checklist encore épinglés à04a5b43 : ne pas présenter leur lot comme inspection du nouveau binaire. Nouvelle certification/captures et recette S25 restent requises. Le dernier run Android4cf89b0 avait échoué deux fois sur permission/clavier/sélecteur; blocage conservé.

Aucun fichier dist/supabase modifié; aucun moteur Responsive recopié. SEO/GEO non applicable : paquet interne, site public inchangé. Aucune production, migration, sauvegarde métier, courriel, push, paiement, fournisseur, signature de distribution, publication ou fusion.
