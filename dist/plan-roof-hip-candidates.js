/* A search envelope is not a roof contour. These candidates retain only
 * neutral source strokes: two fitted hip diagonals, their junction and an
 * observed interval of ridge. Elevations must establish the eventual roof. */
(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./plan-reconstruction-vision.js'):root.MIRReconstructionVision);if(node)module.exports=api;else root.MIRRoofHipCandidates=api;})(typeof window==='object'?window:globalThis,function(V){
 'use strict';
 const finite=Number.isFinite,copy=x=>JSON.parse(JSON.stringify(x)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),point=p=>Array.isArray(p)&&p.length===2&&p.every(finite),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)],supported=s=>s?.support>=.9&&s.maxGap<=3;
 const limits=Object.freeze({probesPerDirection:3000000,pixelChecksPerDirection:3000000,detailedChecksPerDirection:512,seedsPerDirection:128,fragmentsPerLine:16,candidates:24,pixelsPerProof:12000});
 function cancelled(check){if(check?.()){const e=Error('Roof-plan observation cancelled');e.name='AbortError';throw e;}}
 function source(image){if(!image?.data||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.width*image.height>12000000||image.data.length!==image.width*image.height*4)return null;return {width:image.width,height:image.height,data:image.data,ink:V.monochrome(image)};}
 function sampler(src,{record=false,pixels=null,maxChecks=Infinity,thinNeutral=false}={}){
  const samples=new Map(),size=[src.width,src.height];let missing=false,overflow=false,checks=0;
  const colourAt=(x,y)=>{if(x<0||y<0||x>=size[0]||y>=size[1])return null;if(++checks>maxChecks){const e=Error('Roof-plan pixel search limit');e.code='ROOF_PLAN_HIP_CANDIDATE_WORK_LIMIT';throw e;}const index=y*size[0]+x;let colour;
   if(pixels){colour=pixels.get(index);if(colour===undefined){missing=true;return null;}}
   else {const i=index*4;colour=(src.data[i]*16777216+src.data[i+1]*65536+src.data[i+2]*256+src.data[i+3])>>>0;if(record&&!samples.has(index)){if(samples.size>=limits.pixelsPerProof){overflow=true;return null;}samples.set(index,colour);}}return colour;
  };
  const shade=colour=>{const r=colour>>>24,g=(colour>>>16)&255,b=(colour>>>8)&255;return {lo:Math.min(r,g,b),hi:Math.max(r,g,b),value:(r+g+b)/3,alpha:colour&255};};
  const read=(x,y)=>{if(x<0||y<0||x>=size[0]||y>=size[1])return false;
   if(!record&&!pixels&&!thinNeutral){if(++checks>maxChecks){const e=Error('Roof-plan pixel search limit');e.code='ROOF_PLAN_HIP_CANDIDATE_WORK_LIMIT';throw e;}return !!src.ink[y*size[0]+x];}
   const colour=colourAt(x,y);if(colour===null)return false;const s=shade(colour);if(s.alpha>100&&s.value<210&&s.hi-s.lo<45)return true;
   // A faint neutral stroke is eligible only when two opposite nearby
   // flanks are actual light paper. A filled mask or coloured annotation
   // cannot supply this narrow local-contrast evidence.
   if(!thinNeutral||s.alpha<=100||s.hi-s.lo>12||s.hi>236)return false;
   for(const [dx,dy]of [[2,0],[0,2],[2,2],[2,-2]]){const a=colourAt(x+dx,y+dy),b=colourAt(x-dx,y-dy);if(a===null||b===null)continue;const l=shade(a),r=shade(b);if(l.alpha>100&&r.alpha>100&&l.lo>=248&&r.lo>=248&&l.hi-l.lo<=12&&r.hi-r.lo<=12&&l.value-s.value>=12&&r.value-s.value>=12)return true;}return false;
  };
  return {size,at(x,y,radius=0){x=Math.round(x);y=Math.round(y);for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(read(x+dx,y+dy))return true;return false;},proof:()=>({method:'bounded-source-rgba-samples',rasterSize:size,pixels:[...samples].sort((a,b)=>a[0]-b[0])}),valid:()=>!missing&&!overflow,checks:()=>checks};
 }
 function support(ink,a,b){const n=Math.ceil(distance(a,b));if(n<2)return {support:0,maxGap:n+1};let hits=0,gap=0,maxGap=0;for(let i=0;i<=n;i++){const f=i/n;if(ink.at(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,1)){hits++;gap=0;}else maxGap=Math.max(maxGap,++gap);}return {anchors:[a,b],support:hits/(n+1),maxGap};}
 function hasStroke(ink,a,b){const n=Math.ceil(distance(a,b));if(n<2)return false;let hits=0,gap=0;for(let i=0;i<=n;i++){const f=i/n;if(ink.at(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,1)){hits++;gap=0;}else if(++gap>3)return false;if(hits+n-i<(n+1)*.9)return false;}return hits/(n+1)>=.9;}
 function specs(host,size){return [
  {direction:'left',axis:0,boundary:host[0],outward:-1,lo:host[1],hi:host[3]},
  {direction:'right',axis:0,boundary:host[2],outward:1,lo:host[1],hi:host[3]},
  {direction:'back',axis:1,boundary:host[1],outward:-1,lo:host[0],hi:host[2]},
  {direction:'front',axis:1,boundary:host[3],outward:1,lo:host[0],hi:host[2]}
 ].map(s=>{const sign=-s.outward,span=s.hi-s.lo,inner=s.boundary*sign,pad=span*.15;return {...s,normalSign:sign,span,inner,minFragment:Math.max(10,Math.min(host[2]-host[0],host[3]-host[1])*.025),tLo:Math.max(0,Math.floor(s.lo-pad)),tHi:Math.min(size[1-s.axis]-1,Math.ceil(s.hi+pad)),nLo:Math.max(s.outward>0?-size[s.axis]+2:1,Math.floor(inner-span*.55)),nHi:s.outward>0?-1:size[s.axis]-2};});}
 const coordinates=s=>(n,t)=>s.axis===0?[n*s.normalSign,t]:[t,n*s.normalSign];
 function seeds(ink,s,check){
  const at=coordinates(s),result=[];let limited=false;
  scan:for(let outer=Math.ceil(s.inner-5);outer>=s.nLo;outer--){cancelled(check);const runs=[];let start=null,last=-100;const finish=()=>{if(start!==null&&last-start>=s.minFragment)runs.push([start,last]);start=null;};
   for(let t=s.tLo;t<=s.tHi;t++){if(ink.at(...at(outer,t))){if(t-last>3){finish();start=t;}last=t;}else if(start!==null&&t-last>3)finish();}finish();
   if(runs.length>limits.fragmentsPerLine){limited=true;continue;}
   for(let i=0;i<runs.length;i++)for(let j=i;j<runs.length;j++){
    const lo=runs[i][0],hi=runs[j][1],width=hi-lo,ray=Math.max(6,Math.min(14,width*.04));if(width<s.minFragment*2||width>s.span*.85)continue;
    if(![lo,hi].every(t=>hasStroke(ink,at(outer,t),at(outer+ray,t))))continue;
    if(result.some(o=>Math.abs(o.outer-outer)<=3&&Math.abs(o.lo-lo)<=3&&Math.abs(o.hi-hi)<=3))continue;
    if(result.length>=limits.seedsPerDirection){limited=true;break scan;}result.push({outer,lo,hi,fragments:runs.slice(i,j+1)});
   }
  }
  result.sort((a,b)=>(b.hi-b.lo)-(a.hi-a.lo)||b.outer-a.outer||a.lo-b.lo);if(result.length>limits.seedsPerDirection)limited=true;
  return {items:result.slice(0,limits.seedsPerDirection),limited};
 }
 function fitOuter(ink,at,seed){const samples=[];
  for(const [a,b]of seed.fragments)for(let t=a+4;t<=b-4;t++){const ns=[];for(let n=seed.outer-2;n<=seed.outer+2;n++)if(ink.at(...at(n,t)))ns.push(n);if(ns.length&&ns.at(-1)-ns[0]===ns.length-1)samples.push([t,median(ns)]);}
  if(samples.length<8)return null;const normal=median(samples.map(p=>p[1]));return {method:'median-supported-axial-stroke-centres',normal,sampleCount:samples.length,maximumDeviation:Math.max(...samples.map(p=>Math.abs(p[1]-normal)))};
 }
 function fitDiagonal(ink,at,outer,t0,nodeN,nodeT){const samples=[];
  for(let n=Math.ceil(outer+8);n<=Math.floor(nodeN-8);n++){const expected=t0+(nodeT-t0)*(n-outer)/(nodeN-outer),ts=[];for(let t=Math.floor(expected-3);t<=Math.ceil(expected+3);t++)if(ink.at(...at(n,t)))ts.push(t);if(ts.length)samples.push([n,median(ts)]);}
  if(samples.length<12)return null;const count=samples.length,sx=samples.reduce((v,p)=>v+p[0],0),sy=samples.reduce((v,p)=>v+p[1],0),sxx=samples.reduce((v,p)=>v+p[0]*p[0],0),sxy=samples.reduce((v,p)=>v+p[0]*p[1],0),m=(count*sxy-sx*sy)/(count*sxx-sx*sx),c=(sy-m*sx)/count,residual=Math.sqrt(samples.reduce((v,p)=>v+(p[1]-m*p[0]-c)**2,0)/count);
  if(!finite(m)||!finite(c)||residual>1||Math.abs(m*outer+c-t0)>3||Math.abs(m*nodeN+c-nodeT)>3)return null;
  return {method:'least-squares-supported-diagonal-centres',m,c,residual,sampleCount:count};
 }
 function hypothesis(ink,s,seed,guess){
  const at=coordinates(s),width=seed.hi-seed.lo,minimum=Math.max(12,width*.12),outerFit=fitOuter(ink,at,seed);if(!outerFit||Math.abs(outerFit.normal-seed.outer)>2)return null;
  const outer=outerFit.normal,[nodeN,nodeT]=guess,fits=[fitDiagonal(ink,at,outer,seed.lo,nodeN,nodeT),fitDiagonal(ink,at,outer,seed.hi,nodeN,nodeT)];if(fits.some(f=>!f)||fits[0].m<=0||fits[1].m>=0)return null;
  const nn=(fits[1].c-fits[0].c)/(fits[0].m-fits[1].m),tt=fits[0].m*nn+fits[0].c;if(!finite(nn)||Math.abs(nn-nodeN)>5||Math.abs(tt-nodeT)>3)return null;
  const ends=fits.map(f=>at(outer,f.m*outer+f.c)),node=at(nn,tt),diagonals=ends.map(p=>support(ink,p,node));if(!diagonals.every(supported))return null;
  const ray=Math.max(6,Math.min(14,width*.04)),cornerRays=fits.map(f=>{const t=f.m*outer+f.c;return support(ink,at(outer,t),at(outer+ray,t));});if(!cornerRays.every(supported))return null;
  // The end is the end of a bounded observed interval, not an asserted
  // physical ridge termination or the hidden attachment to a parent roof.
  const ridgeLimit=Math.min(s.nHi,s.inner+s.span*.5,nn+Math.max(minimum,width*.5));let last=Math.ceil(nn),gap=0;
  for(let n=Math.ceil(nn);n<=Math.floor(ridgeLimit);n++){if(ink.at(...at(n,tt),1)){last=n;gap=0;}else if(++gap>3)break;}
  if(last-nn<minimum)return null;const ridge={...support(ink,node,at(last,tt)),minimumLength:minimum,intervalOnly:true,endKind:last>=Math.floor(ridgeLimit)-3?'search-limit':'last-supported-pixel'};if(!supported(ridge))return null;
  const outerFragments=seed.fragments.map(([a,b])=>support(ink,at(outer,a),at(outer,b)));if(!outerFragments.every(supported))return null;
  const unobservedIntervals=[];for(let i=1;i<seed.fragments.length;i++){const a=seed.fragments[i-1][1],b=seed.fragments[i][0];if(b-a>3)unobservedIntervals.push({anchors:[at(outer,a),at(outer,b)],pixelsObserved:false,reason:'no-continuous-neutral-source-edge'});}
  return {mode:'two-hip-diagonals-and-ridge',direction:s.direction,anchors:[ends[0],ends[1],node,ridge.anchors[1]],footprintKind:'observed-keypoints',boundaryFragments:[...outerFragments.map(p=>({...p,role:'outer-eave-fragment'})),...cornerRays.map(p=>({...p,role:'side-eave-fragment'}))],boundaryCompleteness:'partial',unobservedIntervals,unresolvedBoundaries:['remaining-side-eaves','parent-attachment'],hip:{status:'observed',method:'fitted-neutral-diagonals-and-substantial-source-ridge',node,diagonals,ridge,fit:{outer:outerFit,diagonals:fits}},sourcePans:[],joinBoundaryObserved:false};
 }
 const geometry=c=>c&&Object.fromEntries(['mode','direction','anchors','footprintKind','boundaryFragments','boundaryCompleteness','unobservedIntervals','unresolvedBoundaries','hip','sourcePans','joinBoundaryObserved'].map(k=>[k,c[k]]));
 function near(a,b){return a.direction===b.direction&&distance(a.hip.node,b.hip.node)<=3&&a.anchors.slice(0,2).every((p,i)=>distance(p,b.anchors[i])<=3);}
 function quality(c){return c.hip.diagonals.reduce((n,s)=>n+(1-s.support)*10,0)+(1-c.hip.ridge.support)*10+c.hip.fit.diagonals.reduce((n,f)=>n+f.residual,0);}
 function detect(image,host,{cancelled:check}={}){
  const src=source(image);if(!src||!Array.isArray(host)||host.length!==4||!host.every(finite)||host[2]-host[0]<20||host[3]-host[1]<20)return {status:'unresolved',candidates:[],issues:['ROOF_PLAN_SOURCE_UNAVAILABLE'],work:[]};
  cancelled(check);const result={version:1,status:'not-found',candidates:[],issues:[],work:[]};
  for(const s of specs(host,[src.width,src.height])){
   const ink=sampler(src,{maxChecks:limits.pixelChecksPerDirection}),hypotheses=[],at=coordinates(s);let probes=0,limited=false,discovered={items:[]},detailedChecks=0;
   try{discovered=seeds(ink,s,check);limited=discovered.limited;
   nextSeed:for(const seed of discovered.items){const width=seed.hi-seed.lo,minRise=Math.max(8,width*.12),maxN=Math.min(seed.outer+width*1.25,s.inner+s.span*.3,s.nHi),minimum=Math.max(12,width*.12);
    for(let n=Math.ceil(seed.outer+minRise);n<=Math.floor(maxN);n++)for(let t=Math.ceil(seed.lo+minRise);t<=Math.floor(seed.hi-minRise);t++){
     if(++probes>limits.probesPerDirection){limited=true;break nextSeed;}if((probes&1023)===0)cancelled(check);if(!ink.at(...at(n,t)))continue;
     const node=at(n,t),ends=[at(seed.outer,seed.lo),at(seed.outer,seed.hi)];if(!ends.every(a=>[.2,.4,.6,.8].every(f=>ink.at(a[0]+(node[0]-a[0])*f,a[1]+(node[1]-a[1])*f,1))))continue;
     if(!hasStroke(ink,node,at(n+minimum,t))||!ends.every(a=>hasStroke(ink,a,node)))continue;
     if(++detailedChecks>limits.detailedChecksPerDirection){limited=true;break nextSeed;}const candidate=hypothesis(ink,s,seed,[n,t]);if(!candidate)continue;const existing=hypotheses.find(h=>near(h.candidate,candidate)),entry={candidate,seed,guess:[n,t]};if(!existing)hypotheses.push(entry);else if(quality(candidate)<quality(existing.candidate))Object.assign(existing,entry);
    }
   }}catch(e){if(e.code!=='ROOF_PLAN_HIP_CANDIDATE_WORK_LIMIT')throw e;limited=true;}
   result.work.push({direction:s.direction,seeds:discovered.items.length,probes:Math.min(probes,limits.probesPerDirection),limit:limits.probesPerDirection,pixelChecks:Math.min(ink.checks(),limits.pixelChecksPerDirection),pixelCheckLimit:limits.pixelChecksPerDirection,detailedChecks:Math.min(detailedChecks,limits.detailedChecksPerDirection),detailedCheckLimit:limits.detailedChecksPerDirection,limited});if(limited)result.issues.push('ROOF_PLAN_HIP_CANDIDATE_WORK_LIMIT');
   for(const h of hypotheses){cancelled(check);if(result.candidates.length>=limits.candidates){result.issues.push('ROOF_PLAN_OBSERVATION_LIMIT');break;}const recorded=sampler(src,{record:true}),candidate=hypothesis(recorded,s,h.seed,h.guess);if(!candidate||!recorded.valid()){result.issues.push('ROOF_PLAN_HIP_PROOF_LIMIT');continue;}
    candidate.hipEvidence={version:1,method:'replayed-neutral-stroke-intersections',search:{host:host.slice(),direction:s.direction,windowOnly:true},seed:copy(h.seed),initialNode:h.guess.slice(),sourcePixels:recorded.proof()};result.candidates.push(candidate);
   }
  }
  result.issues=[...new Set(result.issues)];result.status=result.candidates.length?'proposed':result.issues.length?'unresolved':'not-found';return result;
 }
 function validate(candidate,{sourceSize,image}={}){
  const e=candidate?.hipEvidence,p=e?.sourcePixels,host=e?.search?.host,size=sourceSize||p?.rasterSize,seed=e?.seed,guess=e?.initialNode;
  if(candidate?.mode!=='two-hip-diagonals-and-ridge'||e?.version!==1||e.method!=='replayed-neutral-stroke-intersections'||e.search?.windowOnly!==true||e.search.direction!==candidate.direction||p?.method!=='bounded-source-rgba-samples'||!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0)||size[0]*size[1]>12000000||!same(p.rasterSize,size)||!Array.isArray(host)||host.length!==4||!host.every(finite)||host[2]-host[0]<20||host[3]-host[1]<20||!Array.isArray(p.pixels)||!p.pixels.length||p.pixels.length>limits.pixelsPerProof||!point(guess)||!seed||![seed.outer,seed.lo,seed.hi].every(finite)||!Array.isArray(seed.fragments)||!seed.fragments.length||seed.fragments.length>limits.fragmentsPerLine)return ['ROOF_PLAN_HIP_EVIDENCE'];
  const s=specs(host,size).find(s=>s.direction===candidate.direction),width=seed.hi-seed.lo;if(!s||!Number.isInteger(seed.outer)||seed.outer>s.inner-4||seed.outer<s.nLo||seed.lo<s.tLo||seed.hi>s.tHi||width<s.minFragment*2||width>s.span*.85||seed.fragments.some((f,i)=>!point(f)||!f.every(Number.isInteger)||f[1]-f[0]<s.minFragment||f[0]<seed.lo||f[1]>seed.hi||i&&f[0]-seed.fragments[i-1][1]<=3)||seed.fragments[0][0]!==seed.lo||seed.fragments.at(-1)[1]!==seed.hi||guess[0]<seed.outer+Math.max(8,width*.12)-1||guess[0]>Math.min(seed.outer+width*1.25,s.inner+s.span*.3,s.nHi)||guess[1]<seed.lo+Math.max(8,width*.12)-1||guess[1]>seed.hi-Math.max(8,width*.12))return ['ROOF_PLAN_HIP_SEARCH'];
  const pixels=new Map();let previous=-1;for(const pair of p.pixels){if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isInteger)||pair[0]<=previous||pair[0]<0||pair[0]>=size[0]*size[1]||pair[1]<0||pair[1]>4294967295)return ['ROOF_PLAN_HIP_PIXELS'];previous=pair[0];pixels.set(pair[0],pair[1]);}
  if(image){if(image.width!==size[0]||image.height!==size[1]||image.data?.length!==size[0]*size[1]*4)return ['ROOF_PLAN_HIP_SOURCE'];for(const [index,rgba]of pixels){const i=index*4,current=(image.data[i]*16777216+image.data[i+1]*65536+image.data[i+2]*256+image.data[i+3])>>>0;if(current!==rgba)return ['ROOF_PLAN_HIP_SOURCE'];}}
  const ink=sampler({width:size[0],height:size[1]},{pixels}),replay=hypothesis(ink,s,seed,guess);return ink.valid()&&replay&&same(geometry(replay),geometry(candidate))?[]:['ROOF_PLAN_HIP_REPLAY'];
 }
 // These X coordinates come from registered, observed plan keypoints. They
 // locate a search, never supply the height of the source roof profile.
 function profileConstraint(c,size){
  if(!c||!['outer-eave-profile','orthogonal-return-profile'].includes(c.role)||!Array.isArray(c.sourceBox)||c.sourceBox.length!==4||!c.sourceBox.every(finite)||c.sourceBox[2]<=0||c.sourceBox[3]<=0||c.sourceBox[0]<0||c.sourceBox[1]<0||c.sourceBox[0]+c.sourceBox[2]>size[0]||c.sourceBox[1]+c.sourceBox[3]>size[1]||!finite(c.ridgeX)||!Array.isArray(c.eaveXs)||c.eaveXs.length!==(c.role==='outer-eave-profile'?2:1)||!c.eaveXs.every(x=>finite(x)&&x>=0&&x<size[0])||c.ridgeX<0||c.ridgeX>=size[0])return false;
  const runs=c.eaveXs.map(x=>Math.abs(x-c.ridgeX));return runs.every(n=>n>=24)&&Math.max(...runs)<size[0]*.6&&(c.eaveXs.length===1||c.eaveXs[0]<c.ridgeX&&c.ridgeX<c.eaveXs[1]);
 }
 function fitHorizontalRidge(ink,node,sign,minimum){
  // The search row is only an initial guess. Measure the actual ridge
  // centre from radius-zero pixels beyond its junction with the slope.
  // A clipped, split or broad band supplies no unique stroke centre.
  const xa=node[0]+sign*4,xb=node[0]+sign*minimum,lo=Math.ceil(Math.min(xa,xb)),hi=Math.floor(Math.max(xa,xb)),ylo=Math.floor(node[1])-3,yhi=Math.ceil(node[1])+3,samples=[];
  for(let x=lo;x<=hi;x++){const ys=[];for(let y=ylo;y<=yhi;y++)if(ink.at(x,y))ys.push(y);if(!ys.length)continue;if(ys[0]===ylo||ys.at(-1)===yhi||ys.at(-1)-ys[0]!==ys.length-1||ys.length>4)continue;samples.push((ys[0]+ys.at(-1))/2);}
  if(samples.length<8||samples.length<(hi-lo+1)*.8)return null;const y=median(samples),maximumDeviation=Math.max(...samples.map(n=>Math.abs(n-y)));if(maximumDeviation>1||Math.abs(y-node[1])>3)return null;
  return {method:'median-supported-horizontal-stroke-centres',y,sourceInterval:[lo,hi],sampleCount:samples.length,maximumDeviation};
 }
 function profileHypothesis(ink,c,initial){
  const {eaveY,crestY,shiftX,nodeX}=initial,guesses=c.eaveXs.map(x=>Math.round(x)+shiftX),fits=[];
  for(const x of guesses){const sign=Math.sign(nodeX-x),at=(n,t)=>[n*sign,t],fit=fitDiagonal(ink,at,x*sign,eaveY,nodeX*sign,crestY);if(!fit)return null;fits.push({...fit,m:fit.m*sign});}
  let node,ridgeFit=null,planCompatibility=null;
  if(fits.length===2){const [a,b]=fits;if(a.m>=0||b.m<=0)return null;const x=(b.c-a.c)/(a.m-b.m);node=[x,a.m*x+a.c];if(Math.abs(node[0]-c.ridgeX)>3||Math.abs(node[1]-crestY)>3)return null;}
  else {const f=fits[0],guess=[(crestY-f.c)/f.m,crestY],fittedEaveX=(eaveY-f.c)/f.m,sign=Math.sign(guess[0]-fittedEaveX),minimum=Math.max(12,Math.abs(guess[0]-fittedEaveX)*.15);ridgeFit=fitHorizontalRidge(ink,guess,sign,minimum);if(!ridgeFit)return null;node=[(ridgeFit.y-f.c)/f.m,ridgeFit.y];
   // The source intersection remains intact. Its X error is the vertical
   // stroke error divided by the slope, not an independent observation.
   const slopeY=f.m*c.ridgeX+f.c;planCompatibility={method:'vertical-source-stroke-residual-at-registered-plan-node',point:[c.ridgeX,ridgeFit.y],slopeY,verticalResidual:ridgeFit.y-slopeY,tolerancePixels:3};if(Math.abs(planCompatibility.verticalResidual)>3)return null;
  }
  const eaves=fits.map(f=>[(eaveY-f.c)/f.m,eaveY]);if(!point(node)||node[0]<0||node[0]>=ink.size[0]||eaves.some((p,i)=>!point(p)||p[0]<0||p[0]>=ink.size[0]||Math.abs(p[0]-c.eaveXs[i])>3)||node[1]>=eaveY-5)return null;
  const slopes=fits.map((f,i)=>{const anchors=[eaves[i],node],proof=support(ink,...anchors);return {m:f.m,c:f.c,eaveX:eaves[i][0],eaveY,highX:node[0],highY:node[1],support:proof.support,maxGap:proof.maxGap,fit:f,sourceStroke:proof};});if(!slopes.every(supported))return null;
  const interval=eaves.length===2?[eaves[0],eaves[1]]:[eaves[0],[node[0],eaveY]],eaveProof={...support(ink,...interval),intervalOnly:true};if(!supported(eaveProof))return null;
  let ridgeProof=null;if(eaves.length===1){const sign=Math.sign(node[0]-eaves[0][0]),minimum=Math.max(12,Math.abs(node[0]-eaves[0][0])*.15),end=[node[0]+sign*minimum,node[1]];if(end[0]<0||end[0]>=ink.size[0])return null;ridgeProof={...support(ink,node,end),fit:ridgeFit,planCompatibility,minimumLength:minimum,intervalOnly:true};if(!supported(ridgeProof))return null;}
  const ordered=slopes.length===2?slopes:slopes[0].m<0?[slopes[0],null]:[null,slopes[0]],points=eaves.length===2?[eaves[0],node,node,eaves[1]]:[eaves[0],node,ridgeProof.anchors[1]];
  return {status:'proposed',method:'registered-plan-keypoints-and-observed-elevation-strokes',points,slopes:ordered,eaveProof,ridgeProof,confirmationRequired:true};
 }
 const profileGeometry=p=>p&&Object.fromEntries(['status','method','points','slopes','eaveProof','ridgeProof','confirmationRequired'].map(k=>[k,p[k]]));
 const profileNear=(a,b)=>a.points.length===b.points.length&&a.points.every((p,i)=>distance(p,b.points[i])<=3);
 const profileQuality=p=>p.slopes.filter(Boolean).reduce((n,s)=>n+s.fit.residual+(1-s.support)*10,0);
 function profile(image,constraint,{cancelled:check}={}){
  const src=source(image),none=reason=>({status:'unresolved',reason});if(!src||!profileConstraint(constraint,[src.width,src.height]))return none('ROOF_RETURN_PROFILE_SEARCH_REQUIRED');
  const c=copy(constraint),ink=sampler(src,{maxChecks:limits.pixelChecksPerDirection,thinNeutral:true}),run=Math.max(...c.eaveXs.map(x=>Math.abs(x-c.ridgeX))),by=c.sourceBox[1],rise=Math.max(24,run*1.25),top=Math.max(0,Math.floor(by-Math.max(22,Math.min(40,run*.2)))),bottom=Math.min(src.height-1,Math.ceil(by+8)),found=[];let probes=0,limited=false;
  try{search:for(let eaveY=top;eaveY<=bottom;eaveY++){cancelled(check);const interval=c.eaveXs.length===2?c.eaveXs:[c.eaveXs[0],c.ridgeX];if(!hasStroke(ink,[interval[0],eaveY],[interval[1],eaveY]))continue;
   for(let crestY=Math.max(0,Math.ceil(eaveY-rise));crestY<=eaveY-6;crestY++)for(const shiftX of [-2,0,2])for(const nodeX of [Math.round(c.ridgeX)-2,Math.round(c.ridgeX),Math.round(c.ridgeX)+2]){
    if(++probes>limits.probesPerDirection){limited=true;break search;}if((probes&1023)===0)cancelled(check);const node=[nodeX,crestY];if(!ink.at(...node,1))continue;
    const eaves=c.eaveXs.map(x=>[Math.round(x)+shiftX,eaveY]);if(!eaves.every(a=>[.2,.4,.6,.8].every(f=>ink.at(a[0]+(node[0]-a[0])*f,a[1]+(node[1]-a[1])*f,1))&&hasStroke(ink,a,node)))continue;
    const initial={eaveY,crestY,shiftX,nodeX},p=profileHypothesis(ink,c,initial);if(!p)continue;const old=found.find(f=>profileNear(f.profile,p)),entry={profile:p,initial};if(!old)found.push(entry);else if(profileQuality(p)<profileQuality(old.profile))Object.assign(old,entry);if(found.length>8){limited=true;break search;}
   }
  }}catch(e){if(e.code!=='ROOF_PLAN_HIP_CANDIDATE_WORK_LIMIT')throw e;limited=true;}
  const work={probes,pixelChecks:Math.min(ink.checks(),limits.pixelChecksPerDirection),pixelCheckLimit:limits.pixelChecksPerDirection};
  if(limited)return {...none('ROOF_RETURN_PROFILE_WORK_LIMIT'),work};if(!found.length)return {...none('ROOF_RETURN_SOURCE_PROFILE_REQUIRED'),work};
  if(found.length>1)return {...none('ROOF_RETURN_SOURCE_PROFILE_AMBIGUOUS'),alternatives:found.map(f=>profileGeometry(f.profile)),work};
  const retained=found[0],recorded=sampler(src,{record:true,thinNeutral:true}),p=profileHypothesis(recorded,c,retained.initial);if(!p||!recorded.valid())return {...none('ROOF_RETURN_PROFILE_PROOF_LIMIT'),work};
  p.profileEvidence={version:1,method:'replayed-plan-constrained-elevation-strokes',pixelRule:'narrow-neutral-stroke-with-two-paper-flanks',constraint:c,initial:retained.initial,sourcePixels:recorded.proof()};return p;
 }
 function validateProfile(p,{sourceSize,image,constraint}={}){
  const e=p?.profileEvidence,px=e?.sourcePixels,size=sourceSize||px?.rasterSize,c=e?.constraint,i=e?.initial;
  if(p?.status!=='proposed'||e?.version!==1||e.method!=='replayed-plan-constrained-elevation-strokes'||e.pixelRule!=='narrow-neutral-stroke-with-two-paper-flanks'||px?.method!=='bounded-source-rgba-samples'||!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0)||size[0]*size[1]>12000000||!same(px.rasterSize,size)||!profileConstraint(c,size)||constraint&&!same(c,constraint)||!i||![i.eaveY,i.crestY,i.shiftX,i.nodeX].every(Number.isInteger)||![-2,0,2].includes(i.shiftX)||Math.abs(i.nodeX-Math.round(c.ridgeX))>2||i.eaveY<0||i.crestY<0||i.eaveY>=size[1]||i.crestY>=i.eaveY-5||!Array.isArray(px.pixels)||!px.pixels.length||px.pixels.length>limits.pixelsPerProof)return ['ROOF_RETURN_PROFILE_EVIDENCE'];
  const run=Math.max(...c.eaveXs.map(x=>Math.abs(x-c.ridgeX))),by=c.sourceBox[1],top=Math.max(0,Math.floor(by-Math.max(22,Math.min(40,run*.2)))),bottom=Math.min(size[1]-1,Math.ceil(by+8));if(i.eaveY<top||i.eaveY>bottom||i.crestY<Math.max(0,Math.ceil(i.eaveY-Math.max(24,run*1.25))))return ['ROOF_RETURN_PROFILE_SEARCH'];
  const pixels=new Map();let previous=-1;for(const pair of px.pixels){if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isInteger)||pair[0]<=previous||pair[0]<0||pair[0]>=size[0]*size[1]||pair[1]<0||pair[1]>4294967295)return ['ROOF_RETURN_PROFILE_PIXELS'];previous=pair[0];pixels.set(pair[0],pair[1]);}
  if(image){if(image.width!==size[0]||image.height!==size[1]||image.data?.length!==size[0]*size[1]*4)return ['ROOF_RETURN_PROFILE_SOURCE'];for(const [index,rgba]of pixels){const j=index*4,current=(image.data[j]*16777216+image.data[j+1]*65536+image.data[j+2]*256+image.data[j+3])>>>0;if(current!==rgba)return ['ROOF_RETURN_PROFILE_SOURCE'];}}
  const ink=sampler({width:size[0],height:size[1]},{pixels,thinNeutral:true}),replay=profileHypothesis(ink,c,i);return ink.valid()&&replay&&same(profileGeometry(replay),profileGeometry(p))?[]:['ROOF_RETURN_PROFILE_REPLAY'];
 }
 function elevationSegment(image,anchors){
  const src=source(image);if(!src||!Array.isArray(anchors)||anchors.length!==2||!anchors.every(p=>point(p)&&p[0]>=0&&p[1]>=0&&p[0]<src.width&&p[1]<src.height))return null;
  const ink=sampler(src,{record:true,thinNeutral:true}),stroke=support(ink,...anchors);if(!ink.valid())return null;return {...stroke,strokeEvidence:{version:1,method:'replayed-neutral-elevation-segment',pixelRule:'narrow-neutral-stroke-with-two-paper-flanks',sourcePixels:ink.proof()}};
 }
 function validateElevationSegment(stroke,{sourceSize,image}={}){
  const e=stroke?.strokeEvidence,p=e?.sourcePixels,size=sourceSize||p?.rasterSize,a=stroke?.anchors;if(e?.version!==1||e.method!=='replayed-neutral-elevation-segment'||e.pixelRule!=='narrow-neutral-stroke-with-two-paper-flanks'||p?.method!=='bounded-source-rgba-samples'||!Array.isArray(size)||size.length!==2||!size.every(n=>Number.isInteger(n)&&n>0)||size[0]*size[1]>12000000||!same(p.rasterSize,size)||!Array.isArray(a)||a.length!==2||!a.every(q=>point(q)&&q[0]>=0&&q[1]>=0&&q[0]<size[0]&&q[1]<size[1])||!Array.isArray(p.pixels)||!p.pixels.length||p.pixels.length>limits.pixelsPerProof)return ['ROOF_RETURN_JOIN_EVIDENCE'];
  const pixels=new Map();let previous=-1;for(const pair of p.pixels){if(!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isInteger)||pair[0]<=previous||pair[0]<0||pair[0]>=size[0]*size[1]||pair[1]<0||pair[1]>4294967295)return ['ROOF_RETURN_JOIN_PIXELS'];previous=pair[0];pixels.set(pair[0],pair[1]);}
  if(image){if(image.width!==size[0]||image.height!==size[1]||image.data?.length!==size[0]*size[1]*4)return ['ROOF_RETURN_JOIN_SOURCE'];for(const [index,rgba]of pixels){const j=index*4,current=(image.data[j]*16777216+image.data[j+1]*65536+image.data[j+2]*256+image.data[j+3])>>>0;if(current!==rgba)return ['ROOF_RETURN_JOIN_SOURCE'];}}
  const ink=sampler({width:size[0],height:size[1]},{pixels,thinNeutral:true}),replay=support(ink,...a);return ink.valid()&&same(replay,{anchors:a,support:stroke.support,maxGap:stroke.maxGap})&&supported(stroke)?[]:['ROOF_RETURN_JOIN_REPLAY'];
 }
 function neutralStrokeReader(image,{record=false}={}){const src=source(image);return src?sampler(src,{record,thinNeutral:true,maxChecks:limits.pixelChecksPerDirection}):null;}
 return Object.freeze({version:1,limits,detect,validate,profile,validateProfile,elevationSegment,validateElevationSegment,neutralStrokeReader});
});
