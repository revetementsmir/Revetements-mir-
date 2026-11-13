# Polices de la recette

L’état avant du Studio tente réellement de charger DM Sans et Manrope via `fonts.googleapis.com`. Ce domaine est refusé dans l’environnement : `net::ERR_TUNNEL_CONNECTION_FAILED`. Les captures avant présentent donc le fallback Arial, ce qui est explicitement enregistré dans `before-inventory.json`.

Les fichiers variables officiels sont vendus avec le site pour que le rendu soit vérifiable sans Google Fonts. Sources du 9 novembre 2026 :

- https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/DMSans%5Bopsz,wght%5D.ttf
- https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/Manrope%5Bwght%5D.ttf

Licences OFL originales conservées dans `dist/assets/fonts/`. Aucune police de l’accueil approuvé n’est remplacée : il utilise sa famille Arial existante. La recette après vérifie le statut réel des faces DM Sans et Manrope.
