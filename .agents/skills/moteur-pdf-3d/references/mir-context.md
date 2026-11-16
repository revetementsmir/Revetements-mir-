# Application à Studio MIR

Appliquer cette référence seulement au projet MIR. Relire les consignes courantes : cette fiche conserve le besoin, pas un état de branche ou de publication.

## Objectif confirmé

Développer dans le Studio client un convertisseur autonome : le client importe son dossier PDF, le logiciel reconstruit l'enveloppe extérieure 3D, puis le client choisit et sauvegarde ses revêtements. L'expert aide à développer et vérifier le moteur ; il ne doit pas devenir une étape manuelle obligatoire à chaque dossier.

## Continuité

- Projet de référence : revetementsmir/Revetements-mir-. Retrouver la tâche et la branche actives au moment de l'intervention, sans considérer une ancienne révision comme actuelle.
- Préserver les imports, associations bâtiment/niveau/vue, données enregistrées, corrections de projets validées, choix de finition, français/anglais et autres parcours.
- Garder le développeur actuel comme intégrateur si un travail est déjà en cours. Apporter une analyse ou des changements coordonnés, sans lancer un chantier concurrent.
- Si Atelier est disponible, relire la tâche existante ; son absence n'empêche pas d'utiliser cette compétence avec le code et le contexte autorisés. Aucune connexion à MOON n'est nécessaire.

## Contraintes enregistrées

- Pour la solution visée, privilégier les composants gratuits et le fonctionnement sans clé payante. Ne pas activer un service facturé en supposant qu'il est inclus dans un abonnement de clavardage.
- Ne transférer aucun plan privé, OCR ou capture source à un service externe sans autorisation adaptée. Garder les preuves privées hors des dépôts et artefacts publics.
- Respecter les comptes autorisés par l'utilisateur et toute exclusion exprimée. Ne demander ni récupérer un jeton pour contourner un accès refusé.
- Ne pas déduire de l'autorisation de développer celle de fusionner, publier, migrer la production ou modifier les autres modules. Appliquer les autorisations courantes, sans redemander celles déjà données.

## Priorités métier

Traiter les relations entre façades, niveaux, volumes maison/garage/porche, ouvertures, fondations visibles et toitures. Prévoir des zones distinctes de revêtement, pignons, soffites, fascias et finitions selon le catalogue réel. Conserver le sens de pose et l'échelle des textures.

Un succès Blender sur une fixture synthétique prouve une capacité géométrique locale. Il ne prouve pas à lui seul la lecture et la conversion automatique du PDF d'un client. De même, la réouverture d'un modèle retouché ne prouve pas l'autonomie d'un nouvel import.
