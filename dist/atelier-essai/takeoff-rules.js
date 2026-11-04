const IN_PER_FT=12;
const text=(v,label)=>{const s=String(v??'').trim();if(!s)throw new Error(`${label} requis`);return s};
const pos=(v,label)=>{const n=Number(v);if(!Number.isFinite(n)||n<0)throw new Error(`${label} invalide`);return n};
export const MIR_STOCK_LENGTHS={standardTrimIn:120,jSoffitIn:144};
export const MIR_ALLOWANCES={windowLIn:3,windowDripIn:4};

export function cutLength(measuredIn,{allowanceIn=0}={}){return pos(measuredIn,'Longueur mesurée')+pos(allowanceIn,'Surplus')}
export function windowLLength(openingWidthIn){return cutLength(openingWidthIn,{allowanceIn:MIR_ALLOWANCES.windowLIn})}
export function windowDripLength(openingWidthIn){return cutLength(openingWidthIn,{allowanceIn:MIR_ALLOWANCES.windowDripIn})}
export function trimPieceCount(totalLinearIn,{profile='standard',stockLengthIn}={}){
 const total=pos(totalLinearIn,'Longueur totale'); const stock=stockLengthIn!=null?pos(stockLengthIn,'Longueur stock'):(profile==='j_soffit'?MIR_STOCK_LENGTHS.jSoffitIn:MIR_STOCK_LENGTHS.standardTrimIn);
 if(stock<=0)throw new Error('Longueur stock invalide');return {totalLinearIn:total,stockLengthIn:stock,pieces:total===0?0:Math.ceil(total/stock),profile};
}
export function resolveUnderWindow({ventilated=false}={}){return ventilated?{profile:'ventilated_bottom',reason:'Ventilation sous fenêtre demandée'}:{profile:'L',reason:'Sans ventilation sous fenêtre : L'} }
export function resolveSoffitEdge({edgeRole,relevant=true}={}){
 const role=text(edgeRole,'Rive').toLowerCase(); if(role==='fascia')return {profile:null,allowed:false,reason:'J soffite interdit sur rive fascia'};
 if(role==='soffit'&&relevant)return {profile:'J_soffit',allowed:true,reason:'Rive soffite concernée'};
 return {profile:null,allowed:false,reason:'Aucun J soffite requis pour cette rive'};
}
export function resolveGableVentilation({position='high',requested=true}={}){if(!requested)return {allowed:false,profile:null,reason:'Ventilation non demandée'};if(String(position).toLowerCase()==='high')return {allowed:false,profile:null,reason:'Aucune ventilation haute dans les pignons'};return {allowed:true,profile:'vent',reason:'Ventilation basse/locale selon scénario'} }
export function panelJointProfile({orientation}={}){const o=text(orientation,'Orientation').toLowerCase();if(o==='vertical')return {profile:'L',sizeIn:0.875,priority:'continuous_at_intersections'};if(o==='horizontal')return {profile:'Z',sizeIn:null,priority:'secondary_at_intersections'};throw new Error('Orientation joint inconnue')}
export function resolveMasonryMeeting({supportGeometryKnown=false,profileSuggestion='' }={}){if(!supportGeometryKnown)return {blocked:true,profile:null,reason:'Géométrie réelle du support requise à la rencontre brique'};return {blocked:false,profile:text(profileSuggestion,'Profil rencontre brique'),reason:'Profil confirmé selon géométrie réelle'} }
export function roofAboveL({scenarioConfirmed=false,lengthIn}={}){if(!scenarioConfirmed)return {blocked:true,reason:'L 6 po au-dessus toiture seulement selon cas MIR confirmé'};return {blocked:false,profile:'L',faceIn:6,lengthIn:pos(lengthIn,'Longueur')};}
export function rodentGuard({required,location,claddingRuleConfirmed=false}={}){if(required!==true)return {required:false,blocked:false,profile:null};if(!claddingRuleConfirmed)return {required:true,blocked:true,profile:null,reason:'Règle anti-rongeur du revêtement à confirmer'};return {required:true,blocked:false,profile:'anti_rodent',location:text(location,'Emplacement')};}
export function buildTakeoffLine({id,profile,totalLinearIn,stockLengthIn,source,notes=''}){const count=trimPieceCount(totalLinearIn,{profile,stockLengthIn});return {id:text(id,'ID'),profile:text(profile,'Profil'),source:text(source,'Source'),totalLinearIn:count.totalLinearIn,stockLengthIn:count.stockLengthIn,pieces:count.pieces,notes:String(notes||'')};}
