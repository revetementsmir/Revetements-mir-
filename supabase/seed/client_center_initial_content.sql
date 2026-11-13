-- Optional initial public FAQ content extracted from the historical migration.
-- Deliberately outside the automatic migration chain. Requires separate content approval.
insert into mir_core.help_faq(organization_id,slug,category,question,answer,position)
select organization_id,v.slug,v.category,v.question,v.answer,v.position from mir_core.account_settings cross join(values
 ('suivre-commande','Commandes','Comment suivre ma commande?','Connectez-vous à Mon compte, puis ouvrez Mes commandes et livraisons. Chaque étape confirmée par MIR y apparaît.',10),
 ('delais','Commandes','Quels sont les délais?','Les délais varient selon le fabricant, la couleur, le stock et la complexité. MIR confirme un délai avant la commande finale.',20),
 ('modifier-annuler','Commandes','Puis-je modifier ou annuler une commande?','Clavardez avec MIR rapidement en indiquant la commande. Une modification dépend de son état et des engagements déjà pris.',30),
 ('moulure','Pliage','Comment commander une moulure?','Ouvrez Pliage sur mesure, choisissez le profil, saisissez les mesures et joignez votre plan à la demande.',40),
 ('couleur','Produits','Comment choisir une couleur?','Comparez le nuancier texturé et demandez un échantillon réel. Un écran peut différer du produit installé.',50),
 ('canexel-separe','Produits','Puis-je commander les planches et les baguettes séparément?','Oui. Sur la fiche CanExel Planche et couvre-joint, ajoutez Planches, Baguettes ou les deux avec des quantités distinctes.',60),
 ('quantites','Produits','Comment calculer les quantités?','Utilisez la couverture et le contenu du paquet affichés sur la fiche. MIR validera les pertes, ouvertures et accessoires.',70),
 ('livraison','Livraison','Comment fonctionne la livraison?','Le mode, l’adresse et la plage de livraison sont confirmés avec MIR avant l’expédition.',80),
 ('endommage','Retours','Que faire si un produit est manquant ou endommagé?','Prenez des photos, conservez l’emballage et ouvrez une conversation liée à la commande dès la réception.',90),
 ('plans-photos','Documents','Comment transmettre un plan ou des photos?','Dans une conversation, joignez une photo, un PDF ou un plan de 15 Mo maximum.',100),
 ('parler','Contact','Comment parler à quelqu’un?','Utilisez Clavarder avec MIR ou demandez un rappel. Hors des heures disponibles, votre message devient une demande à traiter.',110)
)v(slug,category,question,answer,position) on conflict do nothing;
