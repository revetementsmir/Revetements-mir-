# Aperçu Application : sources APK Android TEST

L’entrée Application du Responsive ouvre `/test/application/responsive.html`. Le moteur reste celui d’Atelier, chargé dans le même document. Aucun iframe, moteur recopié ou écran métier fictif.

La version est épinglée dans `scripts/apk-preview/source.json`. Le build récupère cette révision, exécute son vrai `mobile/tools/build-web.cjs` et vérifie les empreintes du SDK, des contrôleurs et des styles natifs copiés sans changement. Les fichiers générés ne sont jamais une nouvelle source à maintenir. Le pont de capacités du navigateur est distinct : session navigateur isolée, sans coffre Android, GPS/caméra/QR/PDF natifs non simulés. Le SDK d’autorisation et les rôles de l’application restent inchangés. Aucun backend ni permission ajouté. Apple et APK PRODUCTION restent indisponibles.

## Traiter les annotations Application

Une annotation Application contient le SHA source APK, le chemin HTML `dist/<page>`, les styles `mobile/web/team.css`/`dist/*.css`, la branche Android et la consigne de recompiler. Son sélecteur désigne le vrai élément du rendu. Ne pas corriger seulement l’adaptateur web ou `/test/application` généré.

1. Relire la tête actuelle de la PR Android #31 et les travaux concurrents ; le SHA d’annotation décrit le rendu examiné, pas nécessairement la dernière tête.
2. Modifier les véritables sources `mobile/web/` pour le shell/style natif, ou `dist/` pour un écran partagé. Une correction Android peut nécessiter une surcharge native afin de préserver le site.
3. Rejouer les contrats et recettes Android, reconstruire l’APK avec le processus et la signature autorisés. Une note ajoutée/copée n’exécute pas automatiquement ces opérations.
4. Actualiser la référence d’aperçu après certification, dans les trois emplacements épinglés : JSON source, workflow de recette et workflow Pages. La génération échoue si la source réellement récupérée ne correspond pas au JSON.
5. Comparer les captures du nouvel APK et de l’aperçu. L’identité pixel par pixel avec le Samsung physique reste à vérifier avec ses réglages de densité, texte, thème et barres système. Le navigateur utilise les mêmes sources visuelles mais un moteur différent de la WebView du téléphone.

La publication de cet aperçu n’approuve ni la fusion complète de la PR31 ni une distribution d’APK. Les annotations restent en mémoire jusqu’à copie/envoi explicite. Les captures de CI utilisent l’écran réel de connexion du bundle, sans compte ni donnée métier. SEO/GEO : non applicable, aperçu TEST avec noindex ; accès métier toujours vérifiés par le serveur.
