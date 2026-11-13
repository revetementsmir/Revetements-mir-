# Phase 10 — recertification de la cotation technique

Base : `fbea7077fa24dfc5a2784166e54ec359e19bf7fc`.
Branche : `codex/phase-10-ten-bend-models`; PR #28 maintenue en brouillon.
Ce rapport remplace les anciennes conclusions visuelles sur les repères.

## Moteur commun

`profileSideMarkers` produit des cotes parallèles aux segments, avec deux
attaches quand la longueur permet la cotation classique. Les segments courts
emploient un rappel vers leur milieu. Les petits segments parallèles voisins
privilégient des côtés opposés. Le solveur peut réévaluer ses choix précédents,
avec un budget borné, plutôt que produire une cote en collision. Il ne contient
aucune table de positions propre à un modèle.

La face peinte enregistrée reste indépendante du placement des annotations.
La projection conserve la face physique après rotation et miroir. Le repère
peut glisser le long du segment sur le même côté; il ne change jamais de face
pour obtenir de la place. Le texte commun est « Face 1/Face 2 — côté indiqué
par l’étoile ». Le highlight vert reste absent. La phrase explicative du bas
des fiches PDF a été retirée à la demande de Frederick.

Le développé nominal provient de la somme des segments pour tous les profils;
il est distinct du développé de fabrication dépendant des paramètres atelier.
Les instantanés et historiques ne sont pas réécrits.

## Preuves et périmètre des essais

- `planche-labels-20-rendus.png` : dix modèles, deux faces, totaux nominaux.
- `MIR-phase10-labels-20-rendus.pdf` : vingt pages réellement générées.
- `planche-pdf-20-pages.png` : ces vingt pages rendues par PDF.js.
- `mir-phase10-label-layout-browser.cjs` : 17 profils du catalogue de pliages,
  L/J/Z/Oméga du moteur et deux profils génériques difficiles; deux faces,
  huit orientations avec miroirs, soit 368 configurations transformées.
- Intersections calculées à partir des chemins SVG réellement émis : labels,
  profil, rappels, lignes de cote; cibles aux milieux, cadres, étoile et face
  physique vérifiés. Les vingt dessins PDF doivent rester dans leur cadre.
- `mir-technical-dimensions.cjs` : références indépendantes Beam, Ventilation
  et Fascia; orientation, côté, proximité, séparation B/C, faces et texte PDF.
- `mir-phase10-bending-browser.cjs` : dix modèles sur chacun des sept formats
  demandés, soit 70 parcours; panier Employé et PDF quatre profils/quatre pages.
- Gestion : 19 scénarios PostgreSQL jetable, migrations rejouées deux fois;
  12 contrats Boss/Adjointe, versions et révisions immuables.
- Non-régressions : Phases 6/7/8/9, 45 contrôles MIR, 9 retours A-D,
  Auth/session, Entrepôt, dossiers chantier, Aujourd’hui/Punch, longueurs,
  sélection PDF, tarif navigateur et ateliers fixes (16 formats × 3 ateliers).
- Clavardage relu en mode comparaison PR (`GITHUB_BASE_REF=main`), sans
  modification arbitraire des empreintes BECK historiques.

Les anciens tests dépendant d’un cercle SVG ou d’un astérisque textuel ont
été adaptés au repère transformé et à la vraie étoile vectorielle. Aucune
assertion de séparation, de permission ou d’immutabilité n’a été retirée.
Un workflow PR dédié exécute désormais les contrats, les intersections,
les 70 parcours et la génération PDF réelle.

La première exécution CI de cette recertification a révélé une course dans
le test de pagination de la banque (carte Colonne encore masquée). Le test
attend maintenant l’état initial explicite de la pagination, sans augmenter
son délai. Le dernier passage local couvre les 70 parcours. Le contrôle
des lignes contre l’étoile et les limites réelles du cadre PDF est également
obligatoire; le solveur essaie un autre emplacement sur la même face si nécessaire.

## Limites et garde-fous

Les essais sont automatisés sur Chromium, sans appareil physique. Une matrice
finie ne prouve pas toutes les géométries arbitraires possibles : si le budget
de recherche est épuisé, le moteur refuse le rendu plutôt que cacher une cote.
Les configurations couvertes et les vingt rendus inspectés sont les preuves
de cette recertification, pas une affirmation universelle sans borne.

Aucune migration ni modification serveur nouvelle dans cette correction.
Aucun accès Supabase direct pendant la correction, aucune donnée de recette
serveur créée, aucun courriel, push, commande, paiement ou fournisseur contacté.
Les workflows de rôles TEST existants restent les contrôles de serveur.
Aucune fusion ou publication autorisée; Phase 11 non commencée.
