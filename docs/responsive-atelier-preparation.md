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

## Reprise du 11 novembre — recette complémentaire
Ajout d’annotation en mémoire réussi après correction du sélecteur du test (libellé accessible différent du texte visible). Le moteur ne nécessitait pas de correctif pour cet ajout.
Premier parcours des huit pages et trois formats effectué : DOM unique et absence d’iframe confirmés. Le second parcours avec assertion stricte de débordement échoue sur Boutique téléphone (402 px utiles, 623 px de contenu). Les résultats varient après chargement : recette non stabilisée, ne pas considérer les 24 combinaisons comme certifiées.
Le script contient aussi un contrôle d’exclusion de production.html ; ce contrôle n’est pas atteint lors de l’échec Boutique et reste non vérifié.
Preuve locale : artifacts/responsive-recette.txt (ignoré par Git). Menu : 5/5 contrats.
Aperçu HTTPS : aucune URL de branche vérifiée ; le workflow Pages présent publie main seulement. Conserver la PR en brouillon et ne pas écrire preview dans Atelier avant correction et hébergement vérifié. Les rôles réels, le Studio, les dialogues et le transfert au chat restent à vérifier.
