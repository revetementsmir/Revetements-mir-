# Responsive Atelier MIR — préparation

Base publiée : 1ae3344. Branche indépendante codex/responsive-atelier-mir.
Moteur hébergé v1.2.8, import direct entry.mjs. Activation : ?responsive=atelier.
Huit pages publiques déclarées : index, realisations, contact, materiaux, boutique, produit, selection, pliage.
DOM vivant déplacé dans le document ; aucune iframe ni duplication du moteur.
Une vue active seulement, car les scripts MIR utilisent des identifiants et états globaux.
Les liens privés quittent le mode aperçu ; aucun nouveau rôle ou accès serveur accordé.
Studio et pages privées non intégrés dans ce premier lot.

Vérifié localement dans Chrome : moteur distant chargé, accueil téléphone/tablette/web visible sans débordement, un seul hero et aucune iframe, menu mobile interactif, sélection du lien Mon compte ouvrant le véritable éditeur d’annotation. Menu existant : 5/5 contrats.
À terminer : ajout et transfert complets des annotations, recette des sept autres pages, navigation, dialogues, erreurs réseau, démontage et vérification des rôles avec sessions réelles. Le script navigateur est encore un diagnostic en cours.
Aucun déploiement HTTPS de cette branche effectué. Aucun enregistrement Atelier, aucune modification des autres étapes ou secrets. Ne pas fusionner avant recette et validation humaine.
L’hébergement GitHub Pages publie main ; publier cette intégration nécessite une validation de production ou un hébergement de prévisualisation distinct autorisé.
