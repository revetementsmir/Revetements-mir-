/* MIR inspiration scenes. Presentation only: no catalogue or project claims. */
(function(root){
  'use strict';
  const definitions=[
    ['farmhouse','Farmhouse contemporain','Contemporary farmhouse'],
    ['contemporain','Contemporain moderne','Modern contemporary'],
    ['nordique','Scandinave / Nordique','Scandinavian / Nordic'],
    ['chalet','Chalet moderne / Rustique chic','Modern chalet / Rustic chic'],
    ['craftsman','Craftsman contemporain','Contemporary Craftsman'],
    ['mid-century','Mid-Century Modern','Mid-Century Modern'],
    ['quebecois','Québécois traditionnel revisité','Reimagined traditional Québec']
  ];
  const scenes={
  "contemporain-01": {
    "caption": {
      "fr": "Des volumes horizontaux autour d’une entrée en retrait.",
      "en": "Horizontal volumes around a recessed entrance."
    },
    "alt": {
      "fr": "Maison contemporaine à volumes horizontaux blancs et charbon, avec entrée en bois en retrait et toits plats.",
      "en": "Contemporary house with horizontal white and charcoal volumes, a recessed wood entrance and flat roofs."
    },
    "reviewStatus": "visually-reviewed"
  },
  "contemporain-02": {
    "caption": {
      "fr": "Un pignon vitré, entre bois et pierre claire.",
      "en": "A glazed gable between warm wood and light stone."
    },
    "alt": {
      "fr": "Maison de plain-pied à grand pignon vitré, avec accents de bois, parement charbon et aile basse en pierre claire.",
      "en": "Single-storey house with a large glazed gable, wood accents, charcoal siding and a low light-stone wing."
    },
    "reviewStatus": "visually-reviewed"
  },
  "contemporain-03": {
    "caption": {
      "fr": "Un plain-pied contemporain sous les couleurs d’automne.",
      "en": "A contemporary bungalow framed by autumn colours."
    },
    "alt": {
      "fr": "Bungalow allongé à deux toits monopentes asymétriques, avec clin charbon, pierre pâle et entrée en bois en retrait.",
      "en": "Long bungalow with two asymmetrical shed roofs, charcoal lap siding, pale stone and a recessed wood entrance."
    },
    "reviewStatus": "visually-reviewed"
  },
  "contemporain-04": {
    "caption": {
      "fr": "Volumes décalés et bois chaleureux sous la neige.",
      "en": "Offset volumes and warm wood in the snow."
    },
    "alt": {
      "fr": "Maison contemporaine à volumes rectangulaires décalés, parement de bois vertical et garage bas gris foncé, dans un paysage enneigé.",
      "en": "Contemporary house with offset rectangular volumes, vertical wood siding and a low dark grey garage in a snowy landscape."
    },
    "reviewStatus": "visually-reviewed",
    "position": "50% 70%"
  },
  "farmhouse-01": {
    "caption": {
      "fr": "Pignon clair et grande galerie accueillante.",
      "en": "A light gable and an inviting front porch."
    },
    "alt": {
      "fr": "Maison à deux étages avec pignon blanc, galerie couverte sur poteaux de bois et garage bas à gauche.",
      "en": "Two-storey house with a white gable, a covered porch on timber posts and a low garage to the left."
    },
    "reviewStatus": "visually-reviewed"
  },
  "farmhouse-02": {
    "caption": {
      "fr": "Une silhouette compacte aux accents boisés.",
      "en": "A compact silhouette with warm wood accents."
    },
    "alt": {
      "fr": "Maison compacte à un étage et demi, parement vertical charbon, petite lucarne et perron en bois, entourée d’arbres d’automne.",
      "en": "Compact one-and-a-half-storey house with charcoal vertical siding, a small dormer and a wood stoop, surrounded by autumn trees."
    },
    "reviewStatus": "visually-reviewed"
  },
  "farmhouse-03": {
    "caption": {
      "fr": "Une ferme contemporaine aux volumes en L.",
      "en": "An L-shaped contemporary farmhouse."
    },
    "alt": {
      "fr": "Maison en L avec aile haute à parement gris, aile basse en pierre claire et galerie en bois, sous la neige.",
      "en": "L-shaped house with a taller grey-sided wing, a low light-stone wing and a timber porch in the snow."
    },
    "reviewStatus": "visually-reviewed"
  },
  "farmhouse-04": {
    "caption": {
      "fr": "Trois pignons pour un plain-pied lumineux.",
      "en": "Three gables for a bright single-storey home."
    },
    "alt": {
      "fr": "Long plain-pied blanc à trois petits pignons, fenêtres noires et entrée sous un auvent foncé.",
      "en": "Long white single-storey house with three small gables, black windows and an entrance beneath a dark canopy."
    },
    "reviewStatus": "visually-reviewed"
  },
  "nordique-01": {
    "caption": {
      "fr": "Un pignon épuré au cœur de l’hiver.",
      "en": "A simple gable in a winter landscape."
    },
    "alt": {
      "fr": "Maison étroite à pignon noir et grande façade vitrée, avec une petite terrasse dans un boisé enneigé.",
      "en": "Narrow black-gabled house with a large glazed facade and a small deck in snowy woodland."
    },
    "reviewStatus": "visually-reviewed",
    "position": "50% 65%"
  },
  "nordique-02": {
    "caption": {
      "fr": "Deux volumes simples, reliés par la lumière.",
      "en": "Two simple volumes connected by light."
    },
    "alt": {
      "fr": "Deux volumes à pignon décalés, l’un en bois clair et l’autre blanc, réunis par une entrée vitrée.",
      "en": "Two staggered gabled volumes, one in light wood and one in white, joined by a glazed entrance."
    },
    "reviewStatus": "visually-reviewed"
  },
  "nordique-03": {
    "caption": {
      "fr": "Des lignes nordiques et des contrastes doux.",
      "en": "Nordic lines and gentle contrasts."
    },
    "alt": {
      "fr": "Maison nordique haute à parement pâle et aile basse en bois foncé, avec fenêtres verticales et entrée en retrait.",
      "en": "Tall Nordic-style house with pale siding and a low dark-wood wing, vertical windows and a recessed entrance."
    },
    "reviewStatus": "visually-reviewed"
  },
  "nordique-04": {
    "caption": {
      "fr": "Un refuge bas et ouvert sur le paysage.",
      "en": "A low, open home facing the landscape."
    },
    "alt": {
      "fr": "Maison nordique de plain-pied à toit bas, parement gris argenté et entrée en bois, avec de grandes fenêtres carrées.",
      "en": "Single-storey Nordic house with a low roof, silvery-grey siding, a wood entrance and large square windows."
    },
    "reviewStatus": "visually-reviewed"
  },
  "chalet-01": {
    "caption": {
      "fr": "Un chalet vitré entre bois et pierre.",
      "en": "A glazed chalet framed by wood and stone."
    },
    "alt": {
      "fr": "Chalet à grand pignon triangulaire vitré, charpente de bois apparente et base en pierre, dans un boisé d’été.",
      "en": "Chalet with a large glazed triangular gable, exposed timber framing and a stone base in summer woodland."
    },
    "reviewStatus": "visually-reviewed",
    "position": "50% 65%"
  },
  "chalet-02": {
    "caption": {
      "fr": "Un chalet horizontal aux matières chaleureuses.",
      "en": "A horizontal chalet with warm natural textures."
    },
    "alt": {
      "fr": "Chalet bas à toit large, parement brun horizontal et galerie soutenue par des piliers de pierre, parmi les érables d’automne.",
      "en": "Low chalet with a broad roof, brown horizontal siding and a porch on stone piers among autumn maples."
    },
    "reviewStatus": "visually-reviewed"
  },
  "chalet-03": {
    "caption": {
      "fr": "Un chalet à demi-niveaux dans les conifères.",
      "en": "A split-level chalet among the evergreens."
    },
    "alt": {
      "fr": "Chalet à demi-niveaux sur un terrain boisé en pente, avec base de pierre, aile en bois foncé et balcon protégé.",
      "en": "Split-level chalet on a wooded slope with a stone base, a dark-wood wing and a guarded balcony."
    },
    "reviewStatus": "visually-reviewed"
  },
  "chalet-04": {
    "caption": {
      "fr": "Un pignon chaleureux et des ailes ouvertes.",
      "en": "A warm central gable with open side wings."
    },
    "alt": {
      "fr": "Chalet à pignon central en bois et ailes latérales plus basses, avec véranda vitrée et cheminée de pierre.",
      "en": "Chalet with a central timber gable, lower side wings, a glazed sunroom and a stone chimney."
    },
    "reviewStatus": "visually-reviewed",
    "position": "50% 65%"
  },
  "craftsman-01": {
    "caption": {
      "fr": "Une galerie généreuse et des détails soignés.",
      "en": "A generous porch and carefully considered details."
    },
    "alt": {
      "fr": "Maison Craftsman à larges débords de toit, galerie profonde et poteaux de bois effilés posés sur des bases en pierre.",
      "en": "Craftsman house with broad roof overhangs, a deep porch and tapered timber posts on stone bases."
    },
    "reviewStatus": "visually-reviewed"
  },
  "craftsman-02": {
    "caption": {
      "fr": "Un bungalow Craftsman à l’échelle du quartier.",
      "en": "A Craftsman bungalow scaled for the neighbourhood."
    },
    "alt": {
      "fr": "Bungalow Craftsman à parement crème, petit pignon de galerie et poteaux de bois sur bases maçonnées.",
      "en": "Craftsman bungalow with cream siding, a small porch gable and timber posts on masonry bases."
    },
    "reviewStatus": "visually-reviewed"
  },
  "craftsman-03": {
    "caption": {
      "fr": "Pierre claire et charpente expressive en hiver.",
      "en": "Light stone and expressive timber in winter."
    },
    "alt": {
      "fr": "Maison Craftsman asymétrique à grand pignon, parement brun rouge, pierre claire et éléments de charpente foncés, en hiver.",
      "en": "Asymmetrical Craftsman house with a tall gable, reddish-brown siding, light stone and dark timber details in winter."
    },
    "reviewStatus": "visually-reviewed"
  },
  "craftsman-04": {
    "caption": {
      "fr": "Une galerie d’angle et un toit à lucarnes.",
      "en": "A corner porch beneath a dormered roof."
    },
    "alt": {
      "fr": "Maison à parement bleu charbon, toit à lucarnes et galerie d’angle sur poteaux massifs et bases de pierre.",
      "en": "House with charcoal-blue siding, a dormered roof and a corner porch on substantial posts and stone bases."
    },
    "reviewStatus": "visually-reviewed"
  },
  "mid-century-01": {
    "caption": {
      "fr": "Une toiture papillon et une façade horizontale.",
      "en": "A butterfly roof and a horizontal facade."
    },
    "alt": {
      "fr": "Bungalow long et bas à toiture papillon, brique beige, parement foncé et abri d’auto ouvert.",
      "en": "Long, low bungalow with a butterfly roof, beige brick, dark siding and an open carport."
    },
    "reviewStatus": "visually-reviewed"
  },
  "mid-century-02": {
    "caption": {
      "fr": "Des demi-niveaux et une entrée en retrait.",
      "en": "Split levels with a recessed entrance."
    },
    "alt": {
      "fr": "Maison à demi-niveaux composée d’un volume de brique pâle et d’une aile basse en bois, avec entrée ocre en retrait.",
      "en": "Split-level house with a pale-brick volume, a low wood-clad wing and a recessed ochre entrance."
    },
    "reviewStatus": "visually-reviewed"
  },
  "mid-century-03": {
    "caption": {
      "fr": "Une cour protégée sous de larges débords.",
      "en": "A sheltered courtyard beneath broad overhangs."
    },
    "alt": {
      "fr": "Maison de plain-pied en U à toit plat, larges débords, bois foncé et brique claire autour d’une cour d’entrée.",
      "en": "U-shaped single-storey house with a flat roof, deep overhangs, dark wood and light brick around an entrance courtyard."
    },
    "reviewStatus": "visually-reviewed"
  },
  "mid-century-04": {
    "caption": {
      "fr": "Une ligne de toit forte et de grandes ouvertures.",
      "en": "A strong roofline and generous windows."
    },
    "alt": {
      "fr": "Maison à toit monopente marqué, parement de bois chaleureux, muret de pierre et grande fenêtre d’angle.",
      "en": "House with a pronounced shed roof, warm wood siding, a low stone wall and a large corner window."
    },
    "reviewStatus": "visually-reviewed"
  },
  "quebecois-01": {
    "caption": {
      "fr": "La maison québécoise, sobre et lumineuse.",
      "en": "A bright, understated Quebec-inspired home."
    },
    "alt": {
      "fr": "Maison québécoise à parement blanc, toit pentu à lucarnes et longue galerie couverte devant des fenêtres symétriques.",
      "en": "Quebec-style house with white siding, a steep dormered roof and a long covered porch beneath symmetrical windows."
    },
    "reviewStatus": "visually-reviewed",
    "position": "50% 65%"
  },
  "quebecois-02": {
    "caption": {
      "fr": "La brique et une entrée protégée.",
      "en": "Brick and a sheltered entrance."
    },
    "alt": {
      "fr": "Maison compacte en brique rouge-brun, toit pentu à lucarne centrale et petite entrée vitrée protégée.",
      "en": "Compact reddish-brown brick house with a steep roof, a central dormer and a small sheltered glazed entrance."
    },
    "reviewStatus": "visually-reviewed"
  },
  "quebecois-03": {
    "caption": {
      "fr": "Une silhouette de pierre dans le paysage d’hiver.",
      "en": "A stone silhouette in a winter landscape."
    },
    "alt": {
      "fr": "Maison symétrique en pierre grise à toit pentu, porte centrale en bois et petite aile latérale, dans la neige.",
      "en": "Symmetrical grey-stone house with a steep roof, a central wood door and a small side wing in the snow."
    },
    "reviewStatus": "visually-reviewed"
  },
  "quebecois-04": {
    "caption": {
      "fr": "Une longue galerie et des lucarnes discrètes.",
      "en": "A long front porch with understated dormers."
    },
    "alt": {
      "fr": "Longue maison à clin charbon, toit métallique à trois lucarnes et galerie couverte sur poteaux de bois.",
      "en": "Long house with charcoal clapboard siding, a metal roof with three dormers and a covered porch on timber posts."
    },
    "reviewStatus": "visually-reviewed"
  }
};
  const styles=definitions.map(([id,fr,en])=>({id,name:{fr,en},photos:Array.from({length:4},(_,i)=>{
    const number=String(i+1).padStart(2,'0'),key=id+'-'+number,scene=scenes[key];
    return {id:key,src:'assets/inspirations/'+key+'.webp',largeSrc:'assets/inspirations/'+key+'-large.webp',
      caption:scene?.caption||{fr:'Inspiration '+number,en:'Inspiration '+number},
      alt:scene?.alt||{fr:'Vue extérieure d’une maison d’inspiration '+fr.toLocaleLowerCase('fr-CA')+'.',en:'Exterior view of a house inspired by '+en.toLocaleLowerCase('en-CA')+' architecture.'},
      position:scene?.position||'50% 50%',reviewStatus:scene?.reviewStatus||'awaiting-image-review'};
  })}));
  const freeze=value=>{Object.values(value).forEach(item=>{if(item&&typeof item==='object')freeze(item)});return Object.freeze(value)};
  const data=freeze({version:'20261118.1',initialStyle:'contemporain',styles});
  if(typeof module==='object'&&module.exports)module.exports=data;
  if(root)root.MIRInspirationData=data;
})(typeof window==='object'?window:typeof globalThis==='object'?globalThis:null);
