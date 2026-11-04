/* MIR calepinage / pliages extension — integration candidate for ChatGPT Sites.
 * No GitHub dependency. No dimensions are invented for new profiles: new template
 * defaults are intentionally blank unless the rule itself supplies a fixed delta.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.MIRCalepinageExtension = api;
})(typeof window === 'object' ? window : null, function () {
  'use strict';

  const FRACTIONS = Object.freeze({
    '½':'1/2','¼':'1/4','¾':'3/4','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8',
    '⅓':'1/3','⅔':'2/3','⅕':'1/5','⅖':'2/5','⅗':'3/5','⅘':'4/5','⅙':'1/6','⅚':'5/6'
  });
  const EPS = 1e-9;
  const clone = value => JSON.parse(JSON.stringify(value));
  const deepFreeze = value => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value);
      for (const child of Object.values(value)) deepFreeze(child);
    }
    return value;
  };
  const finite = Number.isFinite;

  function normalizeDimensionText(value) {
    let text = String(value ?? '').trim().toLowerCase()
      .replace(/[″”]/g,'"').replace(/[′’]/g,"'")
      .replace(/\b(pouces?|po|inch(?:es)?|in)\b/g,'')
      .replace(/["']/g,'').trim();
    for (const [glyph, ascii] of Object.entries(FRACTIONS)) {
      text = text.replaceAll(glyph, m => (/(\d)$/.test(text.slice(0, text.indexOf(m))) ? ' ' : '') + ascii);
    }
    // A second deterministic pass handles forms such as 32½ without relying on indexOf.
    text = String(value ?? '').trim().toLowerCase()
      .replace(/[″”]/g,'"').replace(/[′’]/g,"'")
      .replace(/\b(pouces?|po|inch(?:es)?|in)\b/g,'')
      .replace(/["']/g,'')
      .replace(/([0-9])([½¼¾⅛⅜⅝⅞⅓⅔⅕⅖⅗⅘⅙⅚])/g, (_,d,g) => d+' '+FRACTIONS[g])
      .replace(/[½¼¾⅛⅜⅝⅞⅓⅔⅕⅖⅗⅘⅙⅚]/g, g => FRACTIONS[g])
      .replace(/\s+/g,' ').trim();
    return text;
  }

  function parseDimension(value) {
    if (finite(value)) return value;
    const text = normalizeDimensionText(value);
    if (!text) return null;
    if (/^[+-]?\d+(?:[.,]\d+)?$/.test(text)) {
      const n = Number(text.replace(',','.'));
      return finite(n) ? n : null;
    }
    let match = text.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
    if (match) {
      const whole = Number(match[1]), num = Number(match[2]), den = Number(match[3]);
      if (!den) return null;
      const sign = whole < 0 ? -1 : 1;
      return whole + sign * num / den;
    }
    match = text.match(/^([+-]?)(\d+)\s*\/\s*(\d+)$/);
    if (match) {
      const den = Number(match[3]); if (!den) return null;
      return (match[1] === '-' ? -1 : 1) * Number(match[2]) / den;
    }
    return null;
  }

  const gcd = (a,b) => b ? gcd(b,a%b) : Math.abs(a);
  function roundToSixteenth(value) { return Math.round(value * 16) / 16; }
  function formatInches(value) {
    if (!finite(value)) return 'À préciser';
    const rounded = roundToSixteenth(value);
    const sign = rounded < 0 ? '-' : '';
    const abs = Math.abs(rounded);
    let whole = Math.floor(abs + EPS);
    let num = Math.round((abs - whole) * 16);
    if (num === 16) { whole += 1; num = 0; }
    if (!num) return sign + whole + ' po';
    const d = gcd(num,16); num /= d; const den = 16/d;
    const glyphs = {'1/2':'½','1/4':'¼','3/4':'¾','1/8':'⅛','3/8':'⅜','5/8':'⅝','7/8':'⅞'};
    const fraction = glyphs[`${num}/${den}`] || `${num}/${den}`;
    return sign + (whole ? whole + ' ' : '') + fraction + ' po';
  }

  function orthogonalPoint(last, candidate, first = null, snapTolerance = 0) {
    if (!last || !candidate) return candidate;
    const dx = candidate[0] - last[0], dy = candidate[1] - last[1];
    if (Math.abs(dx) >= Math.abs(dy)) {
      let x = candidate[0];
      if (first && Math.abs(x-first[0]) <= snapTolerance) x = first[0];
      return [x,last[1]];
    }
    let y = candidate[1];
    if (first && Math.abs(y-first[1]) <= snapTolerance) y = first[1];
    return [last[0],y];
  }


  function makeOrthogonalMode(input={}) {
    return deepFreeze({
      enabled:input.enabled===true,
      source:String(input.source||'touch-toggle'),
      changedAt:String(input.changedAt||new Date().toISOString())
    });
  }

  function setOrthogonalMode(state, enabled, source='touch-toggle') {
    return makeOrthogonalMode({enabled:enabled===true,source});
  }

  function applyDrawingConstraint(last, candidate, options={}) {
    const enabled=options.keyboardShift===true || options.orthogonalMode?.enabled===true;
    if (!enabled) return Array.isArray(candidate)?candidate.slice():candidate;
    return orthogonalPoint(last,candidate,options.first||null,Number(options.snapTolerance)||0);
  }

  function gableFromPitch(widthIn, eaveIn, leftPitch, rightPitch = leftPitch) {
    const w=parseDimension(widthIn), e=parseDimension(eaveIn), lp=parseDimension(leftPitch), rp=parseDimension(rightPitch);
    if (![w,e,lp,rp].every(finite) || w<=0 || e<0 || lp<=0 || rp<=0) return null;
    const peakXIn = w * rp / (lp + rp);
    const riseIn = peakXIn * lp / 12;
    return {
      widthIn:w, eaveIn:e, leftPitch:lp, rightPitch:rp,
      peakXIn, riseIn, heightIn:e+riseIn,
      leftAngleDeg:Math.atan(lp/12)*180/Math.PI,
      rightAngleDeg:Math.atan(rp/12)*180/Math.PI
    };
  }

  function redistributePanels({ totalAssemblyIn, panelCount, overlapIn = 0, locked = {} }) {
    const total=parseDimension(totalAssemblyIn), overlap=parseDimension(overlapIn);
    const count=Number(panelCount);
    if (!finite(total) || total<=0 || !Number.isInteger(count) || count<1 || !finite(overlap) || overlap<0) {
      return {ok:false,error:'Dimensions, nombre de panneaux ou overlap invalides.'};
    }
    const physicalTarget = total + overlap * Math.max(0,count-1);
    const widths = Array(count).fill(null);
    let lockedTotal=0;
    for (const [key, raw] of Object.entries(locked||{})) {
      const index=Number(key), value=parseDimension(raw);
      if (!Number.isInteger(index)||index<0||index>=count||!finite(value)||value<=0) return {ok:false,error:'Une cote verrouillée est invalide.'};
      widths[index]=value; lockedTotal+=value;
    }
    const unlocked=widths.map((v,i)=>v===null?i:null).filter(i=>i!==null);
    const remaining=physicalTarget-lockedTotal;
    if (remaining<=EPS || !unlocked.length) {
      const closure = widths.reduce((a,b)=>a+(b||0),0)-overlap*Math.max(0,count-1);
      if (!unlocked.length && Math.abs(closure-total)<=EPS) return {ok:true,widthsIn:widths,physicalTargetIn:physicalTarget,closureIn:closure};
      return {ok:false,error:'Les cotes verrouillées ne laissent pas assez de largeur pour fermer la façade.'};
    }
    if (unlocked.length===1) {
      const exact=remaining;
      if (Math.abs(exact*16-Math.round(exact*16))>EPS) return {ok:false,error:'La fermeture exacte n’est pas exprimable au 1/16 po sans modifier une cote verrouillée.'};
      widths[unlocked[0]]=roundToSixteenth(exact);
    } else {
      const average=remaining/unlocked.length;
      for (let i=0;i<unlocked.length-1;i++) widths[unlocked[i]]=roundToSixteenth(average);
      const used=widths.reduce((a,b)=>a+(b||0),0);
      const last=remaining-(used-lockedTotal);
      if (last<=0 || Math.abs(last*16-Math.round(last*16))>EPS) return {ok:false,error:'La fermeture exacte n’est pas exprimable au 1/16 po avec ces cotes verrouillées.'};
      widths[unlocked.at(-1)]=roundToSixteenth(last);
    }
    const closure=widths.reduce((a,b)=>a+b,0)-overlap*Math.max(0,count-1);
    if (Math.abs(closure-total)>EPS) return {ok:false,error:'La redistribution ne ferme pas exactement la façade.'};
    return {ok:true,widthsIn:widths,physicalTargetIn:physicalTarget,closureIn:closure,unlockedIndices:unlocked};
  }

  const PROFILE_TEMPLATES = deepFreeze({
    fascia: {
      id:'fascia', name:'Fascia', version:1,
      geometryStatus:'confirmé par croquis 95821 et cotes fournies', startHeadingDeg:90,
      fields:[
        {id:'height',label:'Face',defaultValue:6,required:true},
        {id:'bottom',label:'Bas',defaultValue:1.25,required:true},
        {id:'hem',label:'Repli',defaultValue:0.625,required:true}
      ],
      segments:[
        {id:'height',fieldId:'height',turnDeg:0},
        {id:'bottom',fieldId:'bottom',turnDeg:-90},
        {id:'hem',fieldId:'hem',turnDeg:-180,foldKind:'hem'}
      ]
    },
    l_replie: {
      id:'l_replie', name:'L replié', version:1,
      geometryStatus:'confirmé par croquis 95821 et cotes fournies', startHeadingDeg:90,
      fields:[
        {id:'face',label:'Face',defaultValue:3,required:true},
        {id:'other',label:'Bas',defaultValue:1.5,required:true},
        {id:'hem',label:'Repli',defaultValue:1.25,required:true}
      ],
      segments:[
        {id:'face',fieldId:'face',turnDeg:0},
        {id:'other',fieldId:'other',turnDeg:-90},
        {id:'hem',fieldId:'hem',turnDeg:-180,foldKind:'hem'}
      ]
    },
    colonne: {
      id:'colonne', name:'Colonne', version:1,
      geometryStatus:'suite ⅞–7–7–1–1 confirmée; orientation conservée du prototype 95821', startHeadingDeg:90,
      fields:[
        {id:'s1',label:'Segment 1',defaultValue:0.875,required:true},
        {id:'s2',label:'Segment 2',defaultValue:7,required:true},
        {id:'s3',label:'Segment 3',defaultValue:7,required:true},
        {id:'s4',label:'Segment 4',defaultValue:1,required:true},
        {id:'s5',label:'Segment 5',defaultValue:1,required:true}
      ],
      segments:[
        {id:'s1',fieldId:'s1',turnDeg:0},
        {id:'s2',fieldId:'s2',turnDeg:90},
        {id:'s3',fieldId:'s3',turnDeg:-90},
        {id:'s4',fieldId:'s4',turnDeg:-90},
        {id:'s5',fieldId:'s5',turnDeg:-90}
      ]
    },
    beam: {
      id:'beam', name:'Beam / cache-poutre', version:1,
      geometryStatus:'cotes 1¼–8–6–8–1¼ confirmées; replis facultatifs sans cote inventée', startHeadingDeg:0,
      fields:[
        {id:'leftFlange',label:'Retour gauche',defaultValue:1.25,required:true},
        {id:'leftSide',label:'Côté gauche',defaultValue:8,required:true},
        {id:'bottom',label:'Dessous',defaultValue:6,required:true},
        {id:'rightSide',label:'Côté droit',defaultValue:8,required:true},
        {id:'rightFlange',label:'Retour droit',defaultValue:1.25,required:true},
        {id:'leftHem',label:'Repli gauche',defaultValue:'',required:false,visibleWhen:'beamHems'},
        {id:'rightHem',label:'Repli droit',defaultValue:'',required:false,visibleWhen:'beamHems'}
      ],
      segments:[
        {id:'leftFlange',fieldId:'leftFlange',turnDeg:0},
        {id:'leftSide',fieldId:'leftSide',turnDeg:90},
        {id:'bottom',fieldId:'bottom',turnDeg:-90},
        {id:'rightSide',fieldId:'rightSide',turnDeg:-90},
        {id:'rightFlange',fieldId:'rightFlange',turnDeg:90}
      ]
    },
    eloignement_eaux: {
      id:'eloignement_eaux', name:'Éloignement des eaux', version:1,
      geometryStatus:'cotes 6–2–½ reprises de la passation maître; développé non calculé', startHeadingDeg:90,
      fields:[
        {id:'drop',label:'Grande face',defaultValue:6,required:true},
        {id:'out',label:'Éloignement horizontal',defaultValue:2,required:true},
        {id:'drip',label:'Petit retour / goutte',defaultValue:0.5,required:true}
      ],
      segments:[
        {id:'drop',fieldId:'drop',turnDeg:0},
        {id:'out',fieldId:'out',turnDeg:-90},
        {id:'drip',fieldId:'drip',turnDeg:45}
      ]
    },
    solin_brique: {
      id:'solin_brique', name:'Moulure solin brique', version:1,
      geometryStatus:'topologie tirée de la référence fournie; cotes laissées vides',
      startHeadingDeg:-90,
      fields:[
        {id:'back',label:'Remontée arrière',defaultValue:'',required:true},
        {id:'seat',label:'Portée / assise',defaultValue:'',required:true},
        {id:'frontDrop',label:'Descente avant',defaultValue:'',required:true},
        {id:'dripReturn',label:'Retour / goutte (si présent)',defaultValue:'',required:false}
      ],
      segments:[
        {id:'back',fieldId:'back',turnDeg:0},
        {id:'seat',fieldId:'seat',turnDeg:90},
        {id:'frontDrop',fieldId:'frontDrop',turnDeg:90},
        {id:'dripReturn',fieldId:'dripReturn',turnDeg:90,optional:true,foldKind:'standard'}
      ]
    },
    coin_arch_90: {
      id:'coin_arch_90', name:'Coin architectural 90°', version:1,
      geometryStatus:'topologie paramétrique; cotes à saisir', startHeadingDeg:0,
      fields:[
        {id:'faceA',label:'Face A',defaultValue:'',required:true},
        {id:'faceB',label:'Face B',defaultValue:'',required:true}
      ],
      segments:[
        {id:'faceA',fieldId:'faceA',turnDeg:0},
        {id:'faceB',fieldId:'faceB',turnDeg:90}
      ]
    },
    coin_arch_retours: {
      id:'coin_arch_retours', name:'Coin architectural avec retours', version:1,
      geometryStatus:'topologie paramétrique; retours et faces à saisir', startHeadingDeg:180,
      fields:[
        {id:'returnA',label:'Retour A',defaultValue:'',required:true},
        {id:'faceA',label:'Face A',defaultValue:'',required:true},
        {id:'faceB',label:'Face B',defaultValue:'',required:true},
        {id:'returnB',label:'Retour B',defaultValue:'',required:true}
      ],
      segments:[
        {id:'returnA',fieldId:'returnA',turnDeg:0},
        {id:'faceA',fieldId:'faceA',turnDeg:-90},
        {id:'faceB',fieldId:'faceB',turnDeg:90},
        {id:'returnB',fieldId:'returnB',turnDeg:90}
      ]
    },
    coin_arch_j: {
      id:'coin_arch_j', name:'Coin architectural avec J intégré', version:1,
      geometryStatus:'topologie J paramétrique; aucune cote de référence inventée', startHeadingDeg:180,
      fields:[
        {id:'faceA',label:'Face extérieure A',defaultValue:'',required:true},
        {id:'faceB',label:'Face extérieure B',defaultValue:'',required:true},
        {id:'jDepth',label:'Profondeur du J',defaultValue:'',required:true},
        {id:'jReturn',label:'Retour du J',defaultValue:'',required:true},
        {id:'nailing',label:'Clouage',defaultValue:'',required:true}
      ],
      segments:[
        {id:'faceA',fieldId:'faceA',turnDeg:0},
        {id:'faceB',fieldId:'faceB',turnDeg:-90},
        {id:'jDepth',fieldId:'jDepth',turnDeg:90},
        {id:'jReturn',fieldId:'jReturn',turnDeg:90},
        {id:'nailing',fieldId:'nailing',turnDeg:-90}
      ],
      rule:'nailing >= jReturn + 1.25'
    }
  });

  function makeTemplateState(templateId) {
    const template=PROFILE_TEMPLATES[templateId];
    if (!template) throw new Error('Profil inconnu.');
    return {
      templateId,
      templateVersion:template.version,
      visibility:'private',
      publishedToEmployeeStore:false,
      publishedToShop:false,
      defaults:Object.fromEntries(template.fields.map(field=>[field.id,{value:field.defaultValue,locked:false}]))
    };
  }

  function setTemplatePublication(state,target,enabled) {
    const next=clone(state);
    if (target==='employeeStore') next.publishedToEmployeeStore=!!enabled;
    else if (target==='shop') next.publishedToShop=!!enabled;
    else throw new Error('Cible de publication inconnue.');
    next.visibility=next.publishedToEmployeeStore||next.publishedToShop?'published':'private';
    return next;
  }

  function updateTemplateDefault(state,fieldId,value,locked=undefined) {
    const next=clone(state);
    if (!next.defaults?.[fieldId]) throw new Error('Mesure de modèle inconnue.');
    next.defaults[fieldId].value=value;
    if (locked!==undefined) next.defaults[fieldId].locked=!!locked;
    return next;
  }

  function resolveProfileValues(templateId,state,overrides={},options={}) {
    const template=PROFILE_TEMPLATES[templateId];
    if (!template) throw new Error('Profil inconnu.');
    const raw={};
    for (const field of template.fields) {
      if (field.visibleWhen==='beamHems' && options.withBeamHems!==true) continue;
      const saved=state?.defaults?.[field.id] ?? {value:field.defaultValue,locked:false};
      const has=Object.prototype.hasOwnProperty.call(overrides,field.id);
      raw[field.id]=saved.locked?saved.value:(has?overrides[field.id]:saved.value);
    }
    return profileValues(templateId,raw,options);
  }

  function profileValues(templateId, input={}, options={}) {
    const template=PROFILE_TEMPLATES[templateId];
    if (!template) throw new Error('Profil inconnu.');
    const out={};
    for (const field of template.fields) {
      if (field.visibleWhen==='beamHems' && options.withBeamHems!==true) { out[field.id]=null; continue; }
      const raw=Object.prototype.hasOwnProperty.call(input,field.id)?input[field.id]:field.defaultValue;
      const value=parseDimension(raw);
      if (value===null) {
        if (field.required) throw new Error(`Mesure requise manquante : ${field.label}.`);
        out[field.id]=null; continue;
      }
      if (value<=0) throw new Error(`La mesure ${field.label} doit être positive.`);
      out[field.id]=value;
    }
    return out;
  }

  function buildProfileGeometry(templateId,input={},options={}) {
    const template=PROFILE_TEMPLATES[templateId];
    const values=profileValues(templateId,input,options);
    let heading=template.startHeadingDeg, point={x:0,y:0};
    const points=[clone(point)], segments=[], extras=[];
    template.segments.forEach((seg,index)=>{
      const len=values[seg.fieldId];
      if (len===null && seg.optional) return;
      if (index>0) heading+=Number(options.angleOverrides?.[seg.id] ?? seg.turnDeg ?? 0);
      const rad=heading*Math.PI/180;
      const end={x:point.x+len*Math.cos(rad),y:point.y+len*Math.sin(rad)};
      segments.push({id:seg.id,fieldId:seg.fieldId,length:len,start:clone(point),end:clone(end),headingDeg:heading,foldKind:seg.foldKind||'standard'});
      point=end; points.push(clone(point));
    });
    if (templateId==='beam' && options.withBeamHems===true) {
      const first=segments[0], last=segments[segments.length-1];
      const left=values.leftHem, right=values.rightHem;
      if (finite(left) && left>0) {
        const a=clone(first.start), b={x:a.x+left,y:a.y};
        extras.push({id:'leftHem',fieldId:'leftHem',length:left,start:a,end:b,headingDeg:0,foldKind:'hem'});
        points.push(clone(b));
      }
      if (finite(right) && right>0) {
        const a=clone(last.end), b={x:a.x-right,y:a.y};
        extras.push({id:'rightHem',fieldId:'rightHem',length:right,start:a,end:b,headingDeg:180,foldKind:'hem'});
        points.push(clone(b));
      }
    }
    return {templateId,values,points,segments,extras,geometryStatus:template.geometryStatus,options:{withBeamHems:options.withBeamHems===true}};
  }

  function checkJRule(input={}) {
    const jReturn=parseDimension(input.jReturn), nailing=parseDimension(input.nailing);
    if (!finite(jReturn)||jReturn<=0||!finite(nailing)||nailing<=0) return {ok:false,type:'invalid-input',message:'Entrez le retour du J et le clouage.'};
    const minimum=jReturn+1.25;
    if (nailing+EPS>=minimum) return {ok:true,currentIn:nailing,minimumIn:minimum,requiresAcceptance:false};
    return {
      ok:false,type:'j-nailing-minimum',currentIn:nailing,minimumIn:minimum,requiresAcceptance:true,
      message:`Clouage actuel ${formatInches(nailing)}; minimum requis ${formatInches(minimum)}.`
    };
  }
  function autoCorrectJ(input={}) {
    const check=checkJRule(input);
    if (check.type==='invalid-input') throw new Error(check.message);
    return {...input,nailing:check.minimumIn};
  }
  function acceptJException(input={}, {accepted=false, acceptedBy='', note=''}={}) {
    const check=checkJRule(input);
    if (check.ok) return null;
    if (check.type!=='j-nailing-minimum') throw new Error(check.message);
    if (accepted!==true) throw new Error('Une acceptation explicite est requise pour garder une valeur hors règle.');
    if (!String(acceptedBy||'').trim()) throw new Error('Le nom ou identifiant de la personne qui accepte l’exception est requis.');
    return deepFreeze({
      code:'MIR_J_NAILING_BELOW_MIN',
      rule:'clouage minimum = retour du J + 1¼ po',
      currentIn:check.currentIn, minimumIn:check.minimumIn,
      accepted:true, acceptedAt:new Date().toISOString(), acceptedBy:String(acceptedBy||''), note:String(note||'')
    });
  }
  function finalizeProfileOrder(templateId,input={},options={}) {
    const geometry=buildProfileGeometry(templateId,input,options);
    const exceptions=[], ruleActions=[];
    if (templateId==='coin_arch_j') {
      const check=checkJRule(geometry.values);
      if (!check.ok) {
        if (options.autoCorrect===true) {
          const corrected=autoCorrectJ(geometry.values);
          ruleActions.push({code:'MIR_J_NAILING_AUTOCORRECT',beforeIn:check.currentIn,afterIn:check.minimumIn,rule:'clouage minimum = retour du J + 1¼ po'});
          const correctedOrder=finalizeProfileOrder(templateId,corrected,{...options,autoCorrect:false});
          return deepFreeze({...clone(correctedOrder),ruleActions:[...ruleActions,...clone(correctedOrder.ruleActions||[])]});
        }
        const exception=acceptJException(geometry.values,options.exception||{});
        exceptions.push(exception);
      }
    }
    const publication=options.publication||{};
    return deepFreeze({
      kind:'mir-parametric-profile-snapshot',
      schemaVersion:2,
      createdAt:new Date().toISOString(),
      templateId, templateVersion:PROFILE_TEMPLATES[templateId].version,
      visibility: publication.employeeStore||publication.shop ? 'published' : 'private',
      publicationSnapshot:{employeeStore:!!publication.employeeStore,shop:!!publication.shop},
      catalogItemCreated:false,
      values:clone(geometry.values), geometry:clone(geometry),
      options:{withBeamHems:options.withBeamHems===true,angleOverrides:clone(options.angleOverrides||{})},
      ruleExceptions:clone(exceptions), ruleActions:clone(ruleActions),
      metadata:clone(options.metadata||{})
    });
  }

  function serializeProfileOrder(order) {
    if (!order || order.kind!=='mir-parametric-profile-snapshot') throw new Error('Snapshot de profil invalide.');
    return JSON.stringify(order);
  }

  function restoreProfileOrder(serialized) {
    let value=serialized;
    if (typeof serialized==='string') {
      try { value=JSON.parse(serialized); } catch { throw new Error('Snapshot de profil illisible.'); }
    }
    if (!value || value.kind!=='mir-parametric-profile-snapshot' || !PROFILE_TEMPLATES[value.templateId]) throw new Error('Snapshot de profil invalide.');
    if (!value.geometry || !value.values || !Array.isArray(value.ruleExceptions||[])) throw new Error('Snapshot de profil incomplet.');
    return deepFreeze(clone(value));
  }

  function profileOrderToProductionPiece(order) {
    const restored=restoreProfileOrder(order);
    return deepFreeze({
      kind:'mir-production-profile',
      productionSource:'order-snapshot',
      templateId:restored.templateId, templateVersion:restored.templateVersion,
      sourceCreatedAt:restored.createdAt,
      values:clone(restored.values), geometry:clone(restored.geometry),
      options:clone(restored.options||{}),
      ruleExceptions:clone(restored.ruleExceptions||[]), ruleActions:clone(restored.ruleActions||[]),
      publicationSnapshot:clone(restored.publicationSnapshot||{employeeStore:false,shop:false}),
      metadata:clone(restored.metadata||{}),
      redrawn:false
    });
  }

  function renderProfileSvg(templateId,input={},options={}) {
    const geometry=buildProfileGeometry(templateId,input,options), width=options.width||640, height=options.height||360, margin=48;
    const drawable=[...geometry.segments,...(geometry.extras||[])];
    const pts=drawable.flatMap(s=>[s.start,s.end]); const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const dx=Math.max(1,maxX-minX),dy=Math.max(1,maxY-minY),scale=Math.min((width-2*margin)/dx,(height-2*margin)/dy);
    const map=p=>({x:margin+(p.x-minX)*scale+(width-2*margin-dx*scale)/2,y:margin+(p.y-minY)*scale+(height-2*margin-dy*scale)/2});
    const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const drawn=drawable.map(seg=>{
      let a=map(seg.start), b=map(seg.end);
      if (seg.foldKind==='hem') {
        const vx=b.x-a.x, vy=b.y-a.y, len=Math.hypot(vx,vy)||1;
        const ox=-vy/len*6, oy=vx/len*6;
        const connector=`<line x1="${a.x}" y1="${a.y}" x2="${a.x+ox}" y2="${a.y+oy}" class="hem-connector"/>`;
        a={x:a.x+ox,y:a.y+oy}; b={x:b.x+ox,y:b.y+oy};
        return connector+`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="profile hem-line"/>`;
      }
      return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="profile"/>`;
    }).join('');
    const labels=drawable.map(seg=>{const a=map(seg.start),b=map(seg.end),x=(a.x+b.x)/2,y=(a.y+b.y)/2;return `<g><rect x="${x-42}" y="${y-13}" width="84" height="26" rx="8"/><text x="${x}" y="${y+4}">${esc(formatInches(seg.length))}</text></g>`;}).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(PROFILE_TEMPLATES[templateId].name)}"><style>.bg{fill:#0f1411}.grid{stroke:#223129;stroke-width:1}.profile{stroke:#fff;stroke-width:4;stroke-linecap:square}.hem-line{stroke:#d8f4de}.hem-connector{stroke:#819889;stroke-width:2}.title{fill:#fff;font:800 20px system-ui}.sub{fill:#9ec8aa;font:600 12px system-ui}g rect{fill:#17351b;stroke:#6ed889}g text{fill:#fff;font:700 12px system-ui;text-anchor:middle}</style><defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" class="grid"/></pattern></defs><rect width="100%" height="100%" class="bg"/><rect width="100%" height="100%" fill="url(#g)"/><text x="18" y="28" class="title">${esc(PROFILE_TEMPLATES[templateId].name)}</text><text x="18" y="48" class="sub">cotes finies · développé non calculé · aucune cote absente inventée</text>${drawn}${labels}</svg>`;
  }

  return Object.freeze({
    version:'1.0.0', normalizeDimensionText, parseDimension, roundToSixteenth, formatInches,
    orthogonalPoint, makeOrthogonalMode, setOrthogonalMode, applyDrawingConstraint, gableFromPitch, redistributePanels,
    PROFILE_TEMPLATES, makeTemplateState, setTemplatePublication, updateTemplateDefault, resolveProfileValues,
    profileValues, buildProfileGeometry, checkJRule, autoCorrectJ, acceptJException, finalizeProfileOrder,
    serializeProfileOrder, restoreProfileOrder, profileOrderToProductionPiece, renderProfileSvg
  });
});
