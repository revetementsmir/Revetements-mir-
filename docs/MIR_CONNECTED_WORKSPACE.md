# Raccordement partagé — livraison de code

Branche codex/connected-workspace depuis main 7317883, synchronisée avec 42406fe (stabilisation de la recette PDF). Les PR 16, 19 et 20 sont désormais fusionnées dans main. Aucun déploiement effectué pendant cette reprise.

## Parcours ajouté

`espace-partage.html` utilise Supabase Auth (courriel/mot de passe), une configuration distincte et uniquement la clé publique fournie par le propriétaire. `shared-config.js` est maintenant préparé avec enabled:true dans la branche de la PR #23, après les contrôles SQL Admin/employé montrés par le propriétaire. Cela ne publie rien; fusion et déploiement restent soumis à son accord. La connexion avec mot de passe reste à tester sur la version publiée. Ni les comptes ni les mots de passe ne sont copiés dans le code. Le portail chantier historique reste inchangé.

Le même catalogue maître sert les destinations Boutique, Magasin et bons fournisseurs. L'Admin importe une sauvegarde de modèles version 1, publie les destinations indépendantes, renseigne prix et conditions, mesures standards et cotes verrouillées. Les imports identiques retournent le même modèle; un contenu différent demande une version explicite. Une nouvelle version ne modifie pas les précédentes et retire la publication Boutique/Magasin jusqu'à revalidation. Les sources sont conservées et les fichiers locaux ne sont jamais supprimés.

Les clients et employés voient uniquement leur catalogue autorisé, une vue 2D et une 3D sur demande. Le serveur vérifie les cotes verrouillées et les longueurs : 120 pouces par défaut, 144 pour le J à soffite explicitement configuré par l'Admin. Cette exception passe en soumission sans prix 10 pi extrapolé. Aucun stock n'est inventé. Les champs de cette tranche sont explicitement en pouces; un import de standards déclarés dans une autre unité est refusé plutôt que converti silencieusement. Les demandes sont à valider par l'Admin, pas des commandes de fabrication automatiquement acceptées ni des paiements.

Les prix des demandes clients sont relus en base; un prix ou propriétaire envoyé par le navigateur est refusé. La demande conserve version, configuration, conditions et prix d'origine. Chaque compte lit uniquement ses demandes; l'Admin les voit toutes dans son organisation. Une nouvelle publication exige un rafraîchissement explicite (pas de Realtime installé); une demande sur une ancienne révision est refusée plutôt que facturée silencieusement au nouveau tarif.

Les chantiers sont créés/affectés par l'Admin. Une demande employé vers un chantier non affecté est refusée côté serveur. L'Admin peut préparer une copie de la demande dans le parcours existant de bons de pliage; elle conserve la référence partagée et ne remplace pas les anciens bons. La copie de travail pour le PDF reste locale à cette étape.

Les demandes non confirmées restent enregistrées par utilisateur et organisation dans le navigateur. Après une panne, la reprise conserve le même requestId; le serveur retourne la demande déjà créée et refuse une réutilisation avec un contenu différent. Une erreur de stockage bloque l'envoi avant toute écriture réseau. La déconnexion invalide les réponses tardives.

## Sécurité et migration

La migration 004 ajoute des tables privées sous RLS et des fonctions publiques à droits explicites, avec auth.uid(), vérification des membres actifs et search_path fixe. Aucun schéma privé supplémentaire ne doit être exposé dans les paramètres API. Les fonctions sont interdites aux anonymes. Les comptes et rôles déjà créés restent intacts.

Appliquer seulement la migration 004 après revue/autorisation; ne pas rejouer l'installation initiale. Elle n'a pas été appliquée au projet distant par l'agent. Le fichier CONNECTER_MIR.sql préparé hors Git ajoute des contrôles préalables. En cas d'échec, la transaction doit être annulée avant toute reprise. Les imports métier sont par modèle, avec source conservée; la reprise d'un lot ignore les sources identiques. Pas de suppression automatique ni d'écrasement des conflits. Une publication peut être retirée/archivée; les demandes historiques restent consultables.

## Shopify

`server/shopify-catalogue.cjs` produit uniquement une projection de produits/variantes à partir du maître MIR et des références de commandes externes. Aucun réseau, stock fictif, secret ni deuxième catalogue maître. Aucun compte Shopify n'est créé et aucune synchronisation n'est déclenchée.

## Vérifications et limites

Tests PostgreSQL/PGlite : rôles, isolation, prix serveur, historique, demandes employé affectées, nouvelles versions, imports et dédoublonnage. Tests navigateur : sessions indépendantes Admin PC, client mobile et employé tablette, import, publication, changement de prix, cotes verrouillées et récupération Admin. L'Auth est simulée exclusivement dans ce test navigateur; les RPC et transactions utilisent réellement PostgreSQL local. Les tests ne certifient pas les mots de passe, courriels ou JWT du service Supabase distant.

L'appel de contrôle à Supabase depuis cet environnement a été refusé par le proxy (tunnel HTTP 403). Cela n'établit pas une panne Supabase. Destination nécessaire aux essais hébergés : gccltmaulvrnthrbnrpd.supabase.co. La clé publique est renseignée et l'activation est préparée dans la branche, sans publication. La migration, l'autorisation réseau des essais, la recette des vrais comptes puis l'activation et le déploiement demandent encore validation.

Hors de cette tranche : paiement, gestion complète des accessoires/inventaire, notifications, validation géométrique de fabrication automatique, connexion du travailleur courriel et webhooks. L'envoi PDF est toujours désactivé en production : le prestataire et l'expéditeur MIR vérifié restent nécessaires. Ne pas annoncer les trois missions entièrement terminées.
