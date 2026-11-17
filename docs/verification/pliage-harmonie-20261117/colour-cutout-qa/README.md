# Recette des couleurs et de l’aperçu TEST

## Périmètre actuel

Le détourage a été annulé par Frederick. Aucun nouveau fichier image généré ne fait partie de cette recette. Le nom historique de ce dossier et du fichier workflow est conservé pour éviter de casser les chemins préparés; la mission porte désormais sur les palettes, leurs aperçus et la livraison TEST.

Trois références représentatives sont suivies dans la boutique, la fiche produit, la revue magasin et le parcours employé simulé :

| Référence | Client avant | Magasin avant | Palette attendue après |
| --- | ---: | ---: | ---: |
| Kit ColorPlus James Hardie | 2 | 1 | 19 |
| Peinture de retouche CanExel | 20 | 16 | 20 |
| Clin Saint-Laurent 6,25 po | 24 | 24 | 24 |

Les cinq références Saint-Laurent conservent leurs 24 teintes. Seuls les clins utilisent le gabarit correspondant James Hardie; les profils V-Groove et Board & Batten restent distincts. Les quatre anciennes couleurs CanExel sans échantillon vérifié restent explicitement sans teinte représentée.

## Vérifications réalisées localement

`verify-data.cjs` compare les IDs attendus, le catalogue canonique, la palette cliente et le catalogue employé. Il vérifie les sources des échantillons, les informations du kit Noir minuit, les 131 références, l’absence de changements sur les autres matériaux et l’accueil, et la géométrie des gabarits. Il exerce aussi réellement `configureLine` pour confirmer le refus d’ajout des deux produits de retouche non commandables.

Le dernier résultat est dans `data-results.json`, avec les empreintes des sources examinées. Les contrôles de syntaxe Node et la lecture YAML du workflow ont été exécutés. Cela ne constitue pas une validation navigateur.

## Recette navigateur préparée pour GitHub Actions

Le lancement local de Chromium a échoué avant toute navigation : `process_singleton_posix.cc`, `socket() failed: Operation not permitted` sur AF_UNIX. Aucune nouvelle capture n’a été obtenue localement. Le résultat vide de la première tentative est marqué explicitement bloqué dans `before/results.json`; la CI le remplacera uniquement après exécution réelle.

Le harnais `capture.cjs` prépare les mêmes scènes à 390×844, 834×1112 et 1440×1050 :

- fiche et nuancier, choix de teinte et persistance après rechargement;
- carte de boutique, palette complète et lien conservant la teinte choisie;
- revue magasin, nuancier complet et photo du contenant conservée;
- parcours employé via la fixture locale existante, menu personnalisé et échantillon séparé du contenant;
- panier Saint-Laurent, changement réel des pixels de l’échantillon et conservation de la couleur après rechargement.

Les retouches restent non commandables. Le harnais ne contourne pas leurs boutons désactivés et ne les ajoute pas artificiellement au panier. Les appels métier de la fixture employé doivent rester à zéro. Aucun compte, courriel, paiement ni backend réel n’est utilisé.

L’état avant est servi depuis le commit sauvegardé `bb39e142e646022a20eb804dacd8001321c7ee19` pour les sources HTML, JS, JSON et CSS. L’état après utilise les sources présentes au SHA exécuté par la CI. Les images originales ne sont pas remplacées.

L’interception de `portal-client.js` utilise le chemin de l’URL afin de couvrir son paramètre de version. Les cartes employé sont ciblées par ID exact. Les comparaisons de pixels Saint-Laurent utilisent explicitement Blanc et Noir pour tester une différence visible sans dépendre de l’ordre de tri du nuancier.

## Exécution prévue

```bash
node docs/verification/pliage-harmonie-20261117/colour-cutout-qa/verify-data.cjs
MIR_COLOUR_CUTOUT_PHASE=before node docs/verification/pliage-harmonie-20261117/colour-cutout-qa/capture.cjs
MIR_COLOUR_CUTOUT_PHASE=after node docs/verification/pliage-harmonie-20261117/colour-cutout-qa/capture.cjs
```

Le workflow **MIR — Couleurs et aperçu TEST** est limité à la branche `codex/pliage-harmonie-20261117`, avec `contents: read`, sans secret applicatif ni publication. Il lance la recette avant/après, les tests de couleurs existants, le build TEST, le contrôle des protections et les 15 cas de galerie/PDF/navigation déjà prévus. Chaque étape conserve son propre résultat; un échec reste bloquant. Les artefacts de détourage sont exclus.

Les captures et résultats réellement produits seront téléversés dans l’artefact `mir-pliage-harmonie-colours-<SHA>`. Les fichiers `source-revision.txt`, `source-stat.txt` et `source-review.patch` relient les preuves aux sources exactes.

## Limites restantes

La première exécution GitHub Actions et l’inspection de ses captures restent à faire. Aucun aperçu Vercel de cette reprise n’est encore déclaré livré dans ce rapport. Chromium simulé ne certifie ni Safari ni un téléphone physique. La galerie de la passation conserve ses preuves antérieures, distinctes des nouvelles vérifications de couleurs.

## Première CI — correction de l’environnement

Le workflow [44135422084](https://github.com/revetementsmir/Revetements-mir-/actions/runs/44135422084), exécuté sur le commit `5ccf9152a2090d448836177bd8948bb0ecd6f9a1`, a réussi les 19 contrats de données et la construction de l’aperçu TEST. Son installation navigateur a échoué : `ubuntu-latest` avait basculé vers Ubuntu 26.04, non pris en charge par Playwright 1.58.2 (`Playwright does not support chromium on ubuntu26.04-x64`). Les étapes navigateur ont donc été ignorées; aucune nouvelle capture ne découle de ce run.

Correction limitée : fixer le runner à `ubuntu-24.04`. Les versions de dépendances, scénarios et assertions restent identiques. Ce changement ne corrige ni ne masque un défaut du site; une nouvelle exécution complète est nécessaire. Les captures historiques éventuellement présentes dans le premier artefact restent des preuves antérieures.

Avant les essais, le checkout CI éphémère efface uniquement `preview-security-results.json`, `preview-browser.json` et les trois sorties `gallery-390.png`, `gallery-834.png`, `gallery-1440.png` concernées. Ces fichiers suivis en Git ne peuvent ainsi plus être réexportés comme de nouvelles preuves après une étape ignorée. Les dossiers et captures sources de la passation sont conservés. Les nouveaux résultats de couleurs indiquent leur phase, leurs empreintes et le SHA exécuté.
