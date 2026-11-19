'use strict';
// Read the rendered SVG projection, then send a real pointer/touch through
// Playwright. Never inject points, change application state or invoke handlers.
async function tapTraceFraction(frame, fraction){
 const svg=frame.locator('#production-drawing svg'),canvas=frame.locator('#production-drawing');
 const position=await svg.evaluate((node,[fx,fy])=>{
  const view=node.viewBox.baseVal,rect=node.closest('#production-drawing').getBoundingClientRect();
  const point=new DOMPoint(view.x+view.width*fx,view.y+view.height*fy).matrixTransform(node.getScreenCTM());
  return{x:point.x-rect.left,y:point.y-rect.top};
 },fraction);
 // The drawing stage owns the actual pointer listeners; the SVG is the
 // rendered projection and may not itself be the hit-test target.
 await canvas.tap({position});
}
module.exports={tapTraceFraction};
