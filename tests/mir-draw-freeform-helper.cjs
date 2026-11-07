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
module.exports={pointOnDrawing,tapDrawing,drawTwoSides};
