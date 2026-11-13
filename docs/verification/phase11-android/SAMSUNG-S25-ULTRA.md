# APK de recette — Samsung S25 Ultra de Frederick

Cet APK **MIR TEST** est réservé à la recette personnelle autorisée. Aucun compte client, aucune production ni distribution employés. Les comptes existants Employé, Chef, Entrepôt, Adjointe et Boss sont les seuls comptes métier acceptés. Ne copier aucun mot de passe dans un rapport ou une capture.

## Installer

1. Ouvrir la PR #31 avec le compte GitHub autorisé, puis le **run Android du SHA final indiqué dans la PR**. Télécharger son artefact `phase11-android-test`. Un ancien artefact ne contient pas les dernières corrections.
2. Dans **Mes fichiers → Téléchargements**, extraire le ZIP. Ouvrir `MIR-TEST-debug.apk` à l’intérieur. Aucun mode développeur requis pour cette installation.
3. Si Android le demande et que les règles du téléphone le permettent, autoriser temporairement l’installation pour **Mes fichiers uniquement**, installer, puis retirer cette autorisation. Si le blocage automatique Samsung ou une politique administrateur refuse l’installation, arrêter et transmettre le message exact; ne désactiver aucune protection générale.
4. Vérifier le nom **MIR TEST**, ouvrir l’application et confirmer « Connexion équipe MIR » et la bannière TEST. Utiliser le compte de recette existant. Aucun nouveau compte à créer, aucune inscription client.

**Si une version est déjà installée : ne pas la désinstaller et ne pas effacer ses données.** L’APK CI est signé par une clé debug éphémère : une autre exécution CI peut avoir une autre signature. Un conflit de signature ne se résout pas sans perdre les données par une simple réinstallation. Arrêter au message exact; une stratégie de signature durable exige une autorisation distincte. La CI certifie la mise à jour `110001 → 110002` avec la même clé dans le même run, pas une mise à jour entre deux runners ou sur le S25.

## Vérifier l’interface sans créer de données

- Connexion lisible en clair/sombre/système et texte Grand, avec clavier; tous les champs et le bouton doivent rester visibles par défilement.
- Aucun bloc commercial, lien Boutique/panier client ou bouton flottant « Aide et soutien » sur la connexion. Le Centre d’aide métier reste accessible après connexion.
- Avec chaque compte autorisé : contrôler le rôle affiché, quitter/revenir, fermer/rouvrir puis se déconnecter; ne soumettre aucun formulaire métier. Vérifier l’absence des données du compte précédent.
- Tester hors ligne puis retour en ligne sans saisir de mutation métier. La bannière ne doit annoncer aucun enregistrement serveur pendant la coupure.

## Recette physique locale — appui long sur l’icône

QR de recette à afficher sur un autre écran :

![RECETTE-PHASE11-QR](RECETTE-PHASE11-QR.png)

Faire un **appui long sur l’icône MIR TEST**, puis choisir **Tester ce téléphone**. Ce raccourci de l’APK debug n’ajoute aucun menu commercial à la connexion. Le retour ramène à la connexion équipe.

Cette page n’a aucun client Auth ni formulaire métier et interdit les connexions réseau par sa CSP. Elle ne crée ni Punch, commande, dépense, message, compte ou pièce jointe serveur. Les permissions Android restent demandées au moment du test.

| Essai | Manipulation | Résultat attendu | État actuel |
|---|---|---|---|
| GPS refusé | Refuser la permission lors de « Demander une position » | Refus explicite, aucun pointage | À faire sur S25 |
| GPS accordé | Autoriser à l’utilisation, demander une position une fois | Position reçue et précision annoncée; coordonnées non affichées/conservées; pas de suivi permanent | À faire sur S25 |
| Photo | Photographier une feuille neutre, confirmer, vérifier l’aperçu puis « Retirer la photo locale » | Bonne photo affichée puis retirée, aucun téléversement | À faire sur S25 |
| Photo annulée/refusée | Annuler l’appareil photo ou refuser la permission | Annulation/refus honnête, aucun faux succès | À faire sur S25 |
| QR | Scanner le QR fourni contenant exactement `RECETTE-PHASE11-QR`, affiché sur un autre écran | Reconnaissance exacte, aucun lien ouvert ni recherche serveur | À faire sur S25 |
| QR annulé | Revenir sans scanner | Annulation explicite | À faire sur S25 |
| Fichier | Choisir un petit PDF ou une image sans donnée personnelle; refaire en annulant | Type et taille confirmés, aucune conservation des octets ni téléversement; annulation explicite | À faire sur S25 |
| Retour/rechargement | Quitter la page de recette et y revenir | Tous les essais reviennent à Non testé; aucune photo persistante | À faire sur S25 |

Pour refaire un refus après une permission accordée : **Paramètres Android → Applications → MIR TEST → Autorisations**, modifier seulement la permission concernée. Le téléphone peut proposer « Cette fois seulement » ou « Lorsque l’application est utilisée »; aucun accès permanent requis.

Noter pour chaque essai : modèle, version Android/One UI, version WebView, versionCode APK, SHA source, résultat attendu/observé et capture **sans coordonnées, compte ou document privé**. Aucun essai n’est marqué réussi avant exécution réelle.

Les vérifications automatiques sur émulateur, les simulations navigateur et la recette physique sont trois preuves distinctes. La vraie pièce jointe **dans un module métier et son stockage serveur** n’est pas certifiée par ce test local; elle exige une recette TEST séparée et autorisée. Aucun courriel, fournisseur, commande réelle ou production ne doit être déclenché.
