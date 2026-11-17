# Recette boutique et couleurs — 17 novembre 2026

Référence initiale : commit `8bf0bdf`. Recette finale après gel annoncé par le responsable des sources.

## Confinement

Serveur HTTP local lié à 127.0.0.1, méthodes GET et HEAD seulement. Interception navigateur: toutes les autres origines et méthodes bloquées. Données panier exclusivement localStorage de contextes éphémères. Aucun envoi de demande, service Auth, Supabase, courriel ni paiement.

## Matrice

Chromium réel sans interface, résolutions CSS 1440×1000,834×1112,390×844, FR et anglais canadien. Touch simulé 834/390. Aucune certification Safari/iOS ou appareil physique.

## Critères

1. Six miniatures catégories: cadres de dimensions cohérentes dans chaque rangée, images chargées, proportions conservées; aucune image manquante, débordement ou navigation cassée.
2. Fibrociment 5¼ et7¼: absence boutique, recherche, filtres; URL directe indisponible sans action ajout; ancien panier identifié indisponible, exclu export et estimation.
3. CanExel, James Hardie, Saint-Laurent: toutes les couleurs compatibles attendues présentes et visibles d’emblée sur cartes et fiches, noms accessibles, une couleur active. Palette comparée aux sources de données gelées, variantes incompatibles exclues.
4. Choix d’une autre teinte: même nœud principal et mêmes paramètres géométriques/source/masque, dimensions visuelles stables; preuve par captures avant/après et différence réelle de pixels du matériau. Le texte ou attribut seul ne suffit pas.
5. Deux tons: échantillon conserve relief et variation de teinte; preuves spécifiques visuelles et distribution de pixels. Une capture ne certifie pas la colorimétrie physique.
6. Pots de retouche existants: choix exact de la palette de leur marque; canevas/visuel change réellement; aucune cellule voisine atlas; aucune création d’un produit absent.
7. Persistance: couleur choisie carte→URL fiche, reload, FR→EN→FR, ajout panier, reload panier, retour fiche et compteur cohérents; unité/quantité/format conservent leurs valeurs métier.
8. Interface: aucune exception JavaScript ni débordement horizontal. Captures page et détails des preuves; pas d’envoi d’estimation.

## Résultats initiaux observés dans les sources

- Cartes: seulement 3 nuances avec +N, sous details fermé.
- Fiches: seulement 6 nuances visibles; suivantes déplacées dans details fermé.
- Hardie 7¼: IDs `hardieplank-select-725` et `hardieplank-smooth-725`; aucun 5¼ dans le catalogue brut.
- Hardie : 19 couleurs de revêtement / 5 de moulure, source locale PDF Québec 06/2025 p.8. Validation des sources officielles confiée à inventory.

Les résultats finaux et les captures seront consignés séparément après gel. Ce document ne constitue pas un PASS.
