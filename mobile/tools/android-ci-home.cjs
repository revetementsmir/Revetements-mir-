'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pngPixels}=require('./native-screen-proofs.cjs');
function verifyHome(dir,label){
 const read=suffix=>fs.readFileSync(path.join(dir,label+suffix),'utf8');
 const window=read('-window.txt'),activity=read('-activity.txt'),xml=read('-ui.xml');
 assert.doesNotMatch(window+'\n'+xml,/Application (?:Not Responding|Error)|AppNotResponding|isn.t responding|not responding|ne répond pas/i,'HOME must have no ANR');
 assert.match(window,/mCurrentFocus=.*com\.android\.launcher3/,'HOME must have a focused window');
 assert.match(activity,/(?:mResumedActivity|topResumedActivity|ResumedActivity:).*com\.android\.launcher3/,'HOME must be resumed');
 assert.match(xml,/package="com\.android\.launcher3"/,'HOME must appear in the actual UI hierarchy');
 const image=pngPixels(path.join(dir,label+'.png'));let lit=0,min=255,max=0;
 for(let i=0;i<image.pixels.length;i+=image.channels){
  const level=Math.max(image.pixels[i],image.pixels[i+1],image.pixels[i+2]);
  if(image.channels===3||image.pixels[i+3]>0){if(level>16)lit++;min=Math.min(min,level);max=Math.max(max,level);}
 }
 assert.ok(lit>image.width*image.height*.05&&max-min>32,'HOME screenshot must show rendered content, not a black/blank transition');
 return{sha256:image.sha256,width:image.width,height:image.height,litPixels:lit,totalPixels:image.width*image.height};
}
module.exports={verifyHome};
if(require.main===module){
 try{console.log(JSON.stringify(verifyHome(process.argv[2],process.argv[3]||'before-tests')));}
 catch(error){console.error('HOME presentation refused: '+error.message.split('\n')[0]);process.exitCode=/ANR/.test(error.message)?2:1;}
}
