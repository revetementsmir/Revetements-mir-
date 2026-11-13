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

## Certification du correctif d1876c7

CI43522576473 entièrement réussie : compilation/unitaires/Lint, six tests natifs, deux contrôles de mise à jour110001→110002/session conservée, cinq rôles réels et refus Admin technique/autre organisation. Rôles43522576494, commandes43522576453 et fondation43522576589 verts.

APK0.11.0-test/110002 debug, source d1876c75b8ec97e52e56a6e535f0cfa00c7e362c. SHA256 vérifié sur les octets téléchargés : e5b025382a29e05cab0b1640a8523c2fec296d2e245e6d5a7cb85cd9e015cdbb. ZIP dd9470499844b7b45d650e9527fa6e8b19698770eff4ab80afadef96249616db. Artefact https://github.com/revetementsmir/Revetements-mir-/actions/runs/43522576473/artifacts/14084546059 . Les trois modules publics et pages publiques sont absents du binaire; des bibliothèques partagées et modules de gestion interne contiennent encore des termes client, sans constituer une entrée de parcours public.

Générateur et checklist réépinglés à ce binaire exact sans reconstruction/signature. Les captures doivent être réellement ouvertes avant validation; la recette physique S25 reste non réalisée. Les commits d’outillage après d1876c7 ne changent pas l’application.
