---
name: moteur-pdf-3d
description: "Développer, corriger et vérifier un moteur logiciel autonome qui convertit des dossiers de plans PDF en bâtiments 3D avec zones de revêtement. Utiliser pour la vision par ordinateur, les cotes, les correspondances plans/élévations/coupes, la géométrie des murs et toitures, et l'intégration au Studio MIR ou à un autre configurateur. Ne pas utiliser pour une simple lecture de PDF, une illustration générée ou la modélisation manuelle isolée d'une maison."
---

# Moteur PDF vers 3D

Construire un logiciel réutilisable : import PDF → reconstruction du bâtiment → visualisation 3D → choix de finitions → sauvegarde et réouverture. Intervenir comme spécialiste de développement en vision par ordinateur et géométrie du bâtiment. Faire fonctionner ensuite cette chaîne dans l'application, sans qu'un agent de clavardage interprète ou modélise chaque dossier client.

Utiliser les outils, le modèle et les autorisations réellement disponibles. Cette compétence apporte une méthode ; elle n'installe pas de moteur 3D, ne change pas de modèle d'IA et ne donne aucun accès supplémentaire. Fonctionner sans dépendance à MOON ni à Atelier. Consulter un suivi existant seulement s'il est disponible et pertinent.

Pour MIR, lire [le contexte du projet](references/mir-context.md). Avant de modifier l'extraction, les contraintes ou la géométrie, lire [les conventions et l'évaluation](references/geometry-and-evaluation.md).

## 1. Reprendre le travail existant

- Identifier la copie de travail, la branche, la révision, les instructions du dépôt et les changements locaux/non poussés. Préserver le travail actif et les corrections de projets déjà validées.
- Garder un intégrateur des changements communs. Répartir les analyses ou modules disjoints si cela aide, sans lancer une seconde implémentation concurrente du même moteur.
- Distinguer ce que fait automatiquement le logiciel, ce qui nécessite une validation, ce qui demande un tracé ou une retouche manuelle, et ce qui manque. Vérifier ces états dans le code et le parcours exécuté.
- Réutiliser l'import, le modèle de données, le rendu et la persistance utiles. Justifier une modification d'architecture par un défaut concret ; ne pas remplacer systématiquement la base.
- Définir les types de plans couverts, les entrées nécessaires, les sorties, les unités, la précision attendue et les budgets de temps/mémoire. Adapter la portée de l'enveloppe au produit, sans imposer les intérieurs ou un BIM complet.

## 2. Constituer une preuve de généralisation

- Utiliser uniquement les documents autorisés. Séparer les plans qui servent au développement d'un ensemble de PDF inédits réservé à l'évaluation.
- Définir les références géométriques et les tolérances avant d'ajuster les règles. Identifier séparément les mesures connues, les annotations de référence et les estimations.
- Figer et identifier la version du corpus et du moteur. Si les règles sont ajustées après inspection d'un dossier réservé, le considérer ensuite comme connu et réserver un autre dossier pour une nouvelle preuve indépendante.
- Ne pas utiliser un nom, une empreinte, un identifiant de client ou un exemple connu pour sélectionner des coordonnées de maison préfabriquées. Employer les empreintes uniquement pour l'intégrité et la traçabilité.
- Si aucun PDF inédit autorisé n'est disponible, poursuivre les améliorations possibles et déclarer la généralisation non vérifiée.

## 3. Extraire les observations du PDF

- Détecter les dessins et leurs limites, les cartouches et les légendes ; attribuer chaque vue au bon bâtiment, niveau et type : plan, élévation, coupe, toiture ou détail.
- Extraire les textes et tracés vectoriels quand ils existent ; employer le rendu raster, l'OCR et l'analyse d'image sur les parties qui le nécessitent. Éviter de rasteriser systématiquement un PDF vectoriel exploitable.
- Conserver page, vue, coordonnées sources, recadrage, rotation, transformations et provenance. Ne pas confondre une ligne de cote, une hachure, un trait caché ou une bordure de page avec un mur.
- Associer les cotes écrites à leurs lignes de cote et points d'ancrage. Vérifier nombres, unités et sens avant de les appliquer à une longueur.

## 4. Calibrer par vue et rapprocher les dessins

- Calibrer chaque vue séparément : une page peut contenir plusieurs échelles. Utiliser plusieurs références concordantes lorsqu'elles sont disponibles.
- Employer une proportion de pixels seulement dans une même vue plane avec une échelle et une transformation justifiées. Ne pas transférer l'échelle d'un autre dessin de la page et ne pas traiter une largeur de porte supposée standard comme une cote certaine.
- Détecter une déformation de scan et les contradictions entre cotes. Corriger seulement ce que les observations permettent d'établir ; conserver les résidus et l'incertitude.
- Mettre en correspondance plans, élévations et coupes dans un repère commun : axes, origine, orientations, altitudes, unités et décalages entre niveaux.
- Rapprocher les observations d'une même ouverture ou arête, contrôler les contradictions et éviter les doublons. Ne pas attribuer à un mur caché l'ouverture d'un volume placé devant.
- Distinguer valeurs mesurées, valeurs déduites et inconnues. Une façade ou une toiture absente des sources ne devient pas certaine parce qu'une géométrie plausible peut être produite.

## 5. Développer une reconstruction contrôlée

- Séparer extraction, résolution des contraintes, représentation architecturale, génération géométrique et affichage. Utiliser les mêmes données de référence pour les vues 2D, le modèle 3D et les exports.
- Représenter les bâtiments, niveaux, murs, retraits, garages, porches, ouvertures, pans de toit, faîtages, pignons, débords, soffites et fascias nécessaires au périmètre retenu.
- Relier les éléments aux observations qui les justifient. Construire les raccords et niveaux à partir de contraintes explicites.
- Vérifier les trous d'ouvertures, contacts entre volumes, intersections, surfaces dégénérées, faces superposées et raccords de toiture. Distinguer notamment un pignon de revêtement d'un retour de toiture à quatre versants.
- Prévoir des états exploitables : résultat dans le périmètre validé, résultat partiel, données insuffisantes, contradiction ou échec expliqué. N'afficher ni zéro trompeur ni dimensions inventées pour combler un manque.
- Automatiser l'orchestration dans le produit. Si une IA à l'exécution est envisagée, vérifier son intégration, son hébergement, ses coûts et l'autorisation de traitement des documents ; ne pas présumer qu'un abonnement de clavardage fournit cette infrastructure.

## 6. Intégrer les choix du client

- Adapter la sortie au moteur de rendu existant ; utiliser GLB/glTF si cela convient, sans faire du maillage exporté l'unique source des dimensions et relations.
- Donner des identifiants sémantiques aux éléments et zones de finition. Maintenir une correspondance explicite lors d'une régénération ; signaler un choix devenu incompatible plutôt que l'appliquer silencieusement à une autre surface.
- Préserver dimensions des textures, sens de pose et choix indépendants des revêtements, couleurs, moulures et sous-faces selon le catalogue réellement disponible.
- Intégrer import, progression, annulation/reprise si nécessaire, gestion des erreurs, sélection de zones, sauvegarde et réouverture. Vérifier la fluidité dans les appareils cibles.

## 7. Vérifier le véritable parcours automatique

- Exécuter le formulaire réel avec un PDF original et un projet neuf, sans charger un modèle déjà corrigé ni réutiliser les retouches d'une session antérieure.
- Enregistrer toutes les interventions effectuées pendant la conversion. Distinguer une sélection de fichier ou de bâtiment d'un tracé, d'une correction de cote ou d'une modification manuelle de géométrie.
- Mesurer les écarts sur dimensions, positions d'ouvertures, niveaux, contours et profils de toiture, ainsi que les omissions et ajouts. Vérifier les différentes façades et angles, pas seulement une vue flatteuse.
- Vérifier le trajet import → reconstruction → rotation → choix de revêtement → sauvegarde → réouverture et, si pris en charge, régénération sans perte des choix.
- Conserver les tests de régression utiles. Des tests synthétiques, une compilation, une CI verte, une capture ou un export réussi ne suffisent pas à certifier la conversion automatique fidèle d'un PDF inédit.
- Mesurer temps de traitement et mémoire avec les cas réels autorisés. Rapporter les échecs et les conversions acceptées à tort, sans annoncer une reconstruction universelle.

## Livrer un résultat vérifiable

Fournir le code intégré dans le périmètre autorisé, la révision concernée, le parcours vérifié, les résultats de fidélité et de performance, les cas pris en charge, les interventions encore nécessaires et les limites restantes. Expliquer la prochaine correction concrète si le moteur est partiel.

Vérifier séparément les licences du code, des poids de modèles, des données et des ressources graphiques retenues. Respecter les autorisations de publication et la confidentialité du projet. Ne pas publier des PDF, OCR, captures ou coordonnées client comme preuves publiques.
