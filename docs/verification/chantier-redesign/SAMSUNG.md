# Recette personnelle Samsung S25 Ultra

Cette recette concerne **MIR Recette S25**, paquet `ca.revetementsmir.equipe.recette.s25`. L’ancienne application **MIR TEST 0.11.0-test**, paquet `ca.revetementsmir.equipe.test`, reste installée avec sa session et ses données. Ne pas la désinstaller, réinitialiser son stockage ou essayer de remplacer sa signature.

## Signature et provenance

Le certificat TEST personnel conservé a l’empreinte SHA-256 `bdd23135e676488c897bbca52ef0dea9f40c112f4a9b535ac1dc36ab2ce15346`. Le fichier de clé et sa copie de sauvegarde protégée ont été retrouvés et comparés identiques. Dossier700, clé et identifiants600, hors Git et APK. Aucune clé privée transmise ou enregistrée dans Atelier. Ces deux copies sont dans l’espace de travail ; elles ne remplacent pas un coffre externe durable.

Le certificat de l’ancien APK historique est différent ; sa clé d’origine n’est pas disponible dans les emplacements examinés. Une mise à jour de cet ancien paquet n’est donc pas proposée. Le paquet personnel déjà installé en120007 peut être mis à jour avec **le même identifiant et la même clé personnelle**. Le numéro, l’empreinte du nouvel APK, le SHA source exact et le lien privé figurent dans le bilan de livraison ; ne pas confondre APK standard CI et APK personnel S25.

Si Android refuse une mise à jour pour signature ou si le paquet installé est différent, arrêter l’installation et relever le message exact. Ne supprimer aucune application ni donnée.

## Compte de recette

Utiliser uniquement un compte **MIR TEST existant et autorisé**, avec son courriel et mot de passe déjà établis. Aucun compte Google ou personnel ne se crée automatiquement. Ne communiquer aucun mot de passe dans le chat. Le bouton Google et les courriels réels restent désactivés. En cas de compte inconnu ou d’accès refusé, identifier le compte TEST côté bureau avant de poursuivre ; ne pas réinitialiser un mot de passe pour contourner le refus.

Les données QA permettent deux jobs fictives nommées « QA UX20261114 Façade A » et « QA UX20261114 Garage B ». Les droits du compte sont relus par le serveur. Les intitulés et rôles des comptes QA doivent être vérifiés dans le profil : les noms historiques de variables de test étaient trompeurs.

## Étapes à guider une par une

Ne pas demander de tout exécuter en même temps. Après chaque étape, relever ce qui est réellement affiché avant de donner la suivante.

1. Vérifier dans les informations de **MIR Recette S25** la version et le paquet. Installer seulement l’APK personnel correspondant, après comparaison du certificat avec120007.
2. Se connecter par courriel avec le compte TEST existant. Vérifier le nom, le rôle et les affectations. Ne pas puncher automatiquement.
3. Parcourir Accueil, Commande, Punch, Message, Plus. Ouvrir la job A, puis B, puis A ; vérifier équipe, tâches et adresse. Ouvrir Itinéraire et revenir : aucun pointage ne doit être créé.
4. Fermer normalement l’application, puis la rouvrir. Vérifier la session, le rôle et la bonne job, sans ressaisir le mot de passe.
5. Redémarrer le téléphone, puis rouvrir **MIR Recette S25**. Vérifier la session restaurée et les autorisations serveur.
6. Depuis avatar → Réglages, activer le déverrouillage système facultatif si le téléphone est sécurisé. Mettre l’application en arrière-plan et revenir : données privées masquées jusqu’au déverrouillage Android. Tester annulation puis repli système ; aucun second NIP MIR.
7. Sur les seules données QA, tester caméra et fichier, annulation/refus des permissions, clavier Message et formulaires, retour Android avec brouillon, rotation, thème sombre et grands textes. Pour GPS/Punch, faire un scénario de recette explicitement contrôlé et vérifier l’état serveur ; pas de localisation permanente.
8. Tester une interruption réseau pendant un envoi QA : contenu conservé, attente/erreur honnête, reprise sans doublon. Vérifier le même objet dans le dossier de la bonne job.
9. Se déconnecter depuis l’avatar. Vérifier disparition des données privées, puis rouvrir l’application : écran de connexion. Un changement de compte TEST ne doit pas afficher les brouillons, conversations ou données de l’autre identité.

## État

Installation de l’ancien paquet personnel120007 déclarée réussie par Frederick et écran de connexion Samsung observé. Les étapes de cette nouvelle recette restent **ouvertes** jusqu’à leurs observations physiques. Chromium, les tests SDK, la compilation et l’émulateur CI accéléré sont documentés séparément ; aucun ne vaut validation Samsung.

## Complément — Accueil8 et Punch2 approuvés le 14 novembre 2026

Le prochain paquet personnel prévu est **0.13.1-s25-test /130005**, successeur de **0.13.0-s25-test /130004**, avec le même paquet et la même clé TEST personnelle. Avant sa remise, comparer les deux certificats sur les binaires, vérifier les ressources embarquées contre le commit final, puis ouvrir réellement les cinq vues natives. Une correspondance entre APK ne remplace pas une lecture directe du certificat installé sur le téléphone. Ne pas utiliser l’APK standard CI pour remplacer le paquet personnel.

La recette physique complémentaire se déroule toujours une étape à la fois :

1. Mettre à jour **MIR Recette S25** sans effacement ; confirmer la version130005 et la conservation de la session. En cas de refus Android, relever le message et arrêter.
2. Sur Accueil, vérifier le vrai nom, les seules jobs autorisées, le menu MIR, Dossier et Itinéraire. Date/météo restent compactes ; une météo indisponible n’est pas une température. Vérifier que les quatre accès Chef ou trois accès Employé, le résumé Punch et les avis tiennent sans être coupés.
3. Dans Punch, vérifier le chantier réel si un pointage est actif ; sinon choisir la proposition de la précédente journée travaillée ou un chantier autorisé. Aucun démarrage automatique. Vérifier le bouton rond, le symbole et le libellé, puis attendre la confirmation du serveur avant de considérer le pointage enregistré.
4. Sur une journée de recette expressément contrôlée, préparer le transfertA→B, l’annuler, puis le confirmer. Le pointageA continue jusqu’à la confirmation ; le chrono de journée conserve son départ. Vérifier les segments côté bureau et ne pas confondre temps écoulé et heures payables.
5. Changer d’onglet, verrouiller/déverrouiller, revenir d’arrière-plan, fermer/rouvrir puis redémarrer. Le chrono et l’aiguille se recalculent depuis les horodatages confirmés ; aucun nouveau pointage ne doit apparaître.
6. Vérifier Commande/Magasin sans défilement de page en portrait standard : recherche, catégories, favoris, pagination et détail. Un panier ne se vide qu’après un reçu réel, sans perdre les articles ajoutés pendant l’envoi. Aucun achat ni envoi réel à faire pour vérifier seulement la navigation.
7. Activer les grands textes et ouvrir le clavier : toutes les actions restent accessibles, au besoin dans une vue secondaire. Vérifier clair/sombre/système, retour Android depuis un choix MIR, annulation et champs obligatoires.
8. Reprendre le verrouillage système facultatif puis la déconnexion des étapes précédentes. Aucun second NIP, aucun compte personnel implicite, aucun secret demandé dans le chat.

Les shifts marquées `QA-SAMSUNG-SYNTHETIC-NOT-PHYSICAL` des comptes automatisés sont des fixtures, pas des présences réelles. Elles sont préparées puis clôturées explicitement pour la CI ; leur existence ne prouve aucune manipulation physique sur le Samsung de Frederick. Les captures Chromium et WebView, les appels TEST sous claims SQL contrôlés et la recette Samsung sont rapportés séparément.
