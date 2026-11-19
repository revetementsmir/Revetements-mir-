'use strict';
// Read the rendered SVG projection, then send a real pointer/touch through
// Playwright. Never inject points, change application state or invoke handlers.
async function tapTraceFraction(frame, fraction){
 const canvas=frame.locator('#production-drawing');
 const position=await canvas.evaluate((stage,[fx,fy])=>{
  const node=stage.querySelector('svg');
  if(!node)throw new Error('The visible drawing canvas has no SVG projection.');
  const view=node.viewBox.baseVal,rect=stage.getBoundingClientRect(),ctm=node.getScreenCTM();
  if(!ctm)throw new Error('The SVG projection is detached from its drawing canvas.');
  const point=new DOMPoint(view.x+view.width*fx,view.y+view.height*fy).matrixTransform(ctm);
  return{x:point.x-rect.left,y:point.y-rect.top};
 },fraction);
 // The drawing stage owns the actual pointer listeners; the SVG is the
 // rendered projection and may not itself be the hit-test target.
 await canvas.tap({position});
}
module.exports={tapTraceFraction};
