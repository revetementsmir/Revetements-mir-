# Outils client — refonte prestige du 17 novembre 2026

Base : main `e9bd39bc5dd4c40663c56bfc21759c543ab4e8d9`, branche `codex/client-prestige-20261117`.

Présentation réalisée sur Pliages, choix de profil, configurateur de panneau client, sources du Studio TEST, ancienne démonstration de matières et écran public Studio « En construction ». Les moteurs, modèles, géométrie, tarifs, données, staging Studio et accès métier n’ont pas été modifiés par ce lot outils.

- Palette commune anthracite/pierre/champagne, contrastes, espacement, formulaires et CTA harmonisés.
- En-tête commun sur les panneaux uniquement avec `mode=client` et `source!=store`; les routes internes conservent Harmony.
- CTA de pliage mobile maintenu au-dessus de la navigation inférieure, avec espace sous les champs.
- Les étapes de pliage et les textes ajoutés sont traduits dans `../tools-i18n.json`, intégrés au dictionnaire par l’intégrateur.

## Vérifications réellement exécutées

Chromium headless réel, serveur local. Les requêtes vers toute autre origine ont été bloquées avant transfert. Aucun compte ni backend n’est utilisé, aucune demande ni aucun courriel envoyé.

- `responsive-results.json` : 40 états de rendu (Pliages, profil, Studio TEST, démo générique, Studio public × 390/768/1024/1440 × FR/EN), aucun débordement horizontal et aucune erreur JavaScript.
- `panel-responsive-results.json` : 8 états panneau client aux mêmes quatre largeurs/deux langues. En-tête commun visible, FR/EN utilisable, aucun débordement/erreur. Le débordement initial de 11 px à 1024 a été corrigé puis le contrôle rejoué.
- `public-responsive-results.json` : 8 captures publiques renouvelées après harmonisation du sélecteur de langue et navigation. Le vrai template `ops/studio-public/under-construction.html` est servi à la place de `plan.html` uniquement par interception locale de lecture; il ne s’agit pas d’un moteur activé.
- `flow-results.json` : parcours réel de deux pliages fictifs à 390 et 1440 px. Mesures 3½ et 2¼ po, face droite, couleurs spéciales balisées, quantités 2 puis 3, instantanés et pièces conservés dans le dossier local; panier affiche deux lignes. Aucun envoi.
- Isolation de présentation : `production.html` et `production.html?mode=client&source=store` conservent le header Harmony, sans attribut `data-mir-prestige-tools` ni classe `mir-prestige`.
- Syntaxe du nouveau script vérifiée avec `node --check`.

## Captures

`*-before.png` sont les captures de départ; `*-after.png` sont intermédiaires avant injection du header global. Pour livraison, utiliser uniquement les noms `*-{390,768,1024,1440}-{fr-CA,en-CA}.png`. Les captures `configuration-*` et `panier-2-pliages-*` documentent des données locales fictives, clairement balisées.

## Limites

Les tailles sont émules dans Chromium, pas des appareils physiques ou Safari. La vérification Studio TEST porte sur la présentation et ses contrôles existants, pas sur une certification du moteur PDF→3D ni un import PDF complet. Le Studio public reste explicitement en construction. Le contrat historique `mir-studio-public-stage.cjs` interdisait tous scripts externes; l’intégrateur ajuste ce contrat pour n’autoriser que les scripts de présentation communs et préserver l’interdiction des moteurs/backend. Aucun résultat de ce test final n’est revendiqué ici.
