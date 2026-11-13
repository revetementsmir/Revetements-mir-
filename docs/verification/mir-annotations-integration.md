# Annotation directe des écrans MIR

Base : a7d2d6fd10d6909d25f262aa06e921342c03d889.

`annoter.html` charge une page HTML MIR autorisée de la même origine, avec
ses vrais scripts, styles, éléments et contrôles d’accès. Le moteur partagé
Atelier fournit la sélection fine, les zones et les commentaires via
`mountAnnotationBoard`. Aucun moteur d’annotation n’est copié dans MIR.
Les pages normales ne chargent pas l’adaptateur.

Entrée après publication autorisée : `annoter.html?page=index.html`.
Le chemin `page` est une liste fermée, sans URL externe ni chemin arbitraire.
Les liens des écrans autorisés conservent le mode annotation. Les notes sont
en mémoire par défaut : les copier avant de changer de page; un avertissement
de sortie protège la saisie. La connexion de stockage Atelier est facultative.
La dictée dépend du service Atelier; elle n’est pas certifiée par cette livraison.

Cette entrée utilise le viewport réel du navigateur. Elle n’émule pas plusieurs
appareils simultanés et ne prétend pas fournir le sélecteur de formats de
`mountResponsiveWorkspace`. Ne pas la présenter comme la certification complète
du workspace multiappareils. Aucun rôle Admin métier ou bypass Auth n’est ajouté.

Contrôles préparés : sélection du petit bouton Boutique sans navigation,
création d’une note, DOM principal sans iframe, entrée mobile et refus d’une
URL externe. Les hôtes Supabase sont bloqués par les tests.

Dans cet exécuteur, Chromium refuse de démarrer : `socket() failed: Operation
not permitted`. L’exécution hors bac à sable est interdite par sa politique.
Le test navigateur doit réussir dans le workflow PR avant certification.

Aucune fusion ou publication effectuée. Aucune ressource Supabase consultée.
Après publication et vérification réelle, enregistrer l’URL dans Atelier.
