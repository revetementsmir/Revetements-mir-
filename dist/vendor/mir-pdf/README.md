# Moteur local des dossiers MIR

jsPDF **4.2.1** et svg2pdf.js **2.9.0**, versions npm figées dans le fichier de verrouillage joint. Distributions UMD officielles, licences MIT jointes. Aucun CDN, service PDF distant ou téléversement.

Sources : https://www.npmjs.com/package/jspdf/v/4.2.1 et https://www.npmjs.com/package/svg2pdf.js/v/2.9.0.

Ces scripts sont chargés à la demande, uniquement pour les faces `mir-dossier`. Les autres exports gardent leur moteur existant. Les polices Liberation Sans déjà embarquées avec PDF.js sont réutilisées et incorporées au PDF. Le logo vectoriel vient de `assets/MIR-logo-officiel-original.svg`.

Le PNG du courriel est dérivé de ce même SVG. Son contenu CID est figé dans le formateur commun pour que la notification scellée et la reprise avec la même clé d’envoi restent stables.
