# Points d’entrée et dépendances examinés

Les références ci-dessous sont des dépendances textuelles réelles. Les modules dynamiques de production sont également contrôlés par les scénarios navigateur. Aucun fichier non référencé n’a été supprimé.

| Fichier | SHA-256 | Référencé depuis |
| --- | --- | --- |
| `production.html` | `4d6041bc77b0b052290025f9702ade6eaab58fdb423693b292ba731729df2b5f` | `boutique.html`, `calepinage-app.js`, `calepinage.html`, `commerce.js`, `coordination.html`, `custom-model-cards.js`, `entrepot.html`, `gestion-boutique.html`, `metres.html`, `mir-shared-workspace.js`, `pliage.html`, `production-app.js`, `selection.html`, `vider-atelier.html`, `mir-harmony.js` |
| `production-app.js` | `409f98cb5c5a6a4817d0390b2703a86a8630f92b7045d03a2043f0a1f1b55317` | `mir-admin-guided.js`, `mir-freeform-workshop.js`, `production-admin-v4.js`, `production.html` |
| `production-model.js` | `4f436e10891277830426f1492ee088491285914318507c4c62b724c20cd13cb3` | `boutique.html`, `calepinage.html`, `chantier.html`, `espace-partage.html`, `mir-bending-presets.js`, `model-measure-defaults.js`, `panel-layout-output.js`, `pliage.html`, `production.html`, `selection.html`, `template-library-backup.js` |
| `production-volume.js` | `c8e58d92c9513456025840e1b7d64db3b7a2fc00f04e79d527d0f8ff10453a40` | `architectural-wall-view.js`, `calepinage.html`, `espace-partage.html`, `mir-panel-po-pdf.js`, `production-model.js`, `production.html` |
| `mir-panel-workbench.js` | `6281d645ccc156a51aac83de2478a13c490b8f4bac2e1dab100a3d40c3c25fb7` | `production.html` |
| `mir-panel-workbench.css` | `547f8e5d69d90d010a375dab8e3e5c776163555459f22fef63ed2ba4c5206243` | `production.html` |
| `mir-procurement.js` | `5af4b736257fe5ba5e235ba20ea04447899d40ee9e21a831f2f48a8cbcae6101` | `production.html` |
| `mir-panel-po-pdf.js` | `8ca7e4b8b5d4f18b275f458434f088a1d3c09ef4879df068f174762cbfb3b0b7` | `mir-panel-workbench.js`, `mir-po-workflow.js`, `production.html` |
| `calepinage.html` | `f69eca9a50de5f31a34115decd4f0847a61a8ce209c924cadafc69c5460f6a4e` | `metres.html`, `mir-panel-workbench.js`, `mir-procurement.js`, `production-app.js`, `production.html`, `mir-harmony.js` |
| `calepinage-app.js` | `930cd5cae0b58d2209ed09a4b20c7aabebe323178f28cb71e33b88d28766688e` | `calepinage.html` |
| `mir-calepinage-mobile.js` | `2e313ff8b6462daf8514a114a1d265d550b8d0b2fa850a4bc4e53638ec08e15d` | `calepinage.html` |
| `mir-calepinage-mobile.css` | `e1603a9566ffff9f68a5815fff01e12e697470ff865042f5c55fb4f220668418` | `calepinage.html` |
| `boutique.html` | `056a7d0cf9c6733edc5161ab7e81317a00c0eedc19b4fb532b6a3916cdbbeb8b` | `chantier.html`, `commerce.js`, `dossier.html`, `index.html`, `materiaux.html`, `metres.html`, `plan.html`, `pliage.html`, `production-app.js`, `production.html`, `produit.html`, `realisations.html`, `selection.html`, `mir-harmony.js` |
| `chantier.html` | `af91d14e159331bb330839eab9d3d9007b6e3800a9ebd2aaa07a14e6ace837bb` | `boutique.html`, `coordination.html`, `entrepot.html`, `index.html`, `magasin-revue.html`, `materiaux.html`, `metres.html`, `plan.html`, `pliage.html`, `portal-client.js`, `portal-config.js`, `production.html`, `produit.html`, `realisations.html`, `selection.html`, `mir-harmony.js` |
| `entrepot.html` | `fd90b80fcfb99fd6f694b37f90b8b72adffb594f8cfba05cd7646a2b6ce06d25` | `coordination.html`, `mir-warehouse-core.js`, `mir-harmony.js` |
| `mir-harmony.js` | `2b7b7537d19947956d16b430ec066b862cf945270c36e9d4bc339931ab4cd326` | `boutique.html`, `calepinage.html`, `chantier.html`, `entrepot.html`, `pliage.html`, `production.html`, `selection.html` |
| `mir-harmony.css` | `e5262cbea877a3bc82b107a19a38e3a390448baa13df4203428e85488b689139` | `boutique.html`, `calepinage.html`, `chantier.html`, `entrepot.html`, `pliage.html`, `production.html`, `selection.html` |

Production : `production-app.js` possède le draft et le dossier; `production-admin-v4.js` et `mir-freeform-workshop.js` déplacent les contrôles de présentation. `mir-procurement.js` possède les boutons de navigation et bons. Harmony déplace les nœuds existants, sans dupliquer leurs gestionnaires.

Panneaux : le modèle calcule; le volume construit le mesh; le workbench présente une pièce sélectionnée; le PDF PR50 est réutilisé. Les seules coordonnées nouvelles sont des positions de présentation SVG, jamais des dimensions de fabrication.

Calepinage : `calepinage.html` charge les moteurs architecturaux, le layout, les dimensions par pièce et le contrôleur mobile. Le calcul et les verrous ne sont pas modifiés.

PR51 : `chantier.html` reçoit seulement les imports communs près du début du head et un marqueur sur html. Ses changements de fin de head, de contrôleur employé et de CSS restent séparés; la combinaison a été testée dans un worktree distinct.
