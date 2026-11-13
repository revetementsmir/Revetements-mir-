'use strict';
/* Données de test : générer les segments par vrais clics/taps DANS le tableau SVG.
 * Ne pas réintroduire une commande hors tableau qui ajoute des traits. */
async function pointOnDrawing(page,x,y){
 const area=page.locator('#production-drawing');
 await area.scrollIntoViewIfNeeded();
 return area.locator('svg').evaluate((svg,[x,y])=>{
  const p=svg.createSVGPoint();p.x=x;p.y=y;
  const ctm=svg.getScreenCTM();if(!ctm)throw Error('Dessin SVG sans matrice');
  const point=p.matrixTransform(ctm);return {x:point.x,y:point.y};
 },[x,y]);
}
async function tapDrawing(page,x,y){
 const point=await pointOnDrawing(page,x,y);
 if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)) await page.touchscreen.tap(point.x,point.y);
 else await page.mouse.click(point.x,point.y);
}
async function drawTwoSides(page){
 for(const [x,y] of [[190,260],[440,260],[440,140]])await tapDrawing(page,x,y);
}
async function openWorkshopStep(page,targetStep=4){
 if(await page.locator('#mir-workspace').count()){
  const finish=page.locator('.mir-workspace-tools [data-freeform-finish]');
  if(await finish.isVisible()&&await finish.isEnabled())await finish.click();
  await revealControl(page,'#production-dimensions');
  return false;
 }
 const isMobile=await page.locator('body.mir-mobile-stepper').count()>0;
 if(isMobile){
  const target=Math.max(2,Math.min(4,targetStep));
  for(let attempt=0;attempt<4;attempt++){
   const step=Number(await page.locator('body').getAttribute('data-mir-mobile-step'))||1;
   if(step>=target)return true;
   await page.locator('#mir-freeform-toolbar [data-freeform-next]').click();
   const now=Number(await page.locator('body').getAttribute('data-mir-mobile-step'))||1;
   if(now!==step+1)throw Error('Étape MIR mobile bloquée : '+step+' → '+now);
  }
  throw Error('Étape MIR mobile '+target+' inaccessible');
 }
 const finish=page.locator('[data-freeform-finish]');
 if(await finish.isVisible()&&await finish.isEnabled())await finish.click();
 return false;
}
async function revealControl(page,selector){
 const node=page.locator(selector).first();
 if(await page.locator('#mir-workspace').count()&&await node.evaluate(e=>!!e.closest('#mir-inspector'))){
  if(!await page.locator('#mir-inspector').isVisible())await page.locator('#mir-workspace-settings').click();
 }
 const ancestors=node.locator('xpath=ancestor::details');
 for(let i=0;i<await ancestors.count();i++){const d=ancestors.nth(i);if(!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();}
 return node;
}
module.exports={pointOnDrawing,tapDrawing,drawTwoSides,openWorkshopStep,revealControl};
