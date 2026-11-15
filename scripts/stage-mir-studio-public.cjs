'use strict';
/* Release-only transformation. Never change dist/plan.html, dist/studio.html,
 * business routes, client drafts or the isolated MIR TEST copy. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const TEST='hxtztkmbfpmzrieccwsg';
const FILES=['plan.html','studio.html'];
const digest=v=>crypto.createHash('sha256').update(v).digest('hex');
function stage(root,templateFile=path.resolve(__dirname,'../ops/studio-public/under-construction.html')){
  root=fs.realpathSync(root);
  const source=fs.realpathSync(path.resolve(__dirname,'../dist'));
  if(root===source||root.startsWith(source+path.sep)||root===path.parse(root).root)throw Error('Refus de modifier les sources Studio ou la racine');
  const targetTest=path.join(root,'test');
  const marker=JSON.parse(fs.readFileSync(path.join(targetTest,'mir-test-environment.json'),'utf8'));
  if(marker.environment!=='test'||marker.projectRef!==TEST||!/^[a-f0-9]{40}$/.test(marker.revision))throw Error('MIR TEST isolé requis avant la préparation publique');
  const expected={};
  for(const name of FILES){
    const publicFile=path.join(root,name),testFile=path.join(targetTest,name);
    const original=fs.readFileSync(publicFile,'utf8'),test=fs.readFileSync(testFile,'utf8');
    if(!test.includes('mir-test-guard.js')||!test.includes('Content-Security-Policy'))throw Error('Studio TEST non isolé: '+name);
    if(!test.includes(name==='plan.html'?'id="open-library"':'id="page-title"'))throw Error('Outil Studio TEST introuvable: '+name);
    if(!original.includes(name==='plan.html'?'id="open-library"':'id="page-title"'))throw Error('Source Studio originale absente: '+name);
    expected[name]={source:digest(original),test:digest(test)};
  }
  const template=fs.readFileSync(templateFile,'utf8');
  if(!template.includes('data-mir-studio-public-state="construction"')||!template.includes('En construction par l’équipe MIR')||!template.includes('Under construction by the MIR team')||/supabase\.co|recette=1|mir-test-guard\.js/.test(template))throw Error('Écran public invalide');
  for(const name of FILES)fs.writeFileSync(path.join(root,name),template,'utf8');
  for(const name of FILES){
    if(digest(fs.readFileSync(path.join(targetTest,name)))!==expected[name].test)throw Error('Studio TEST a changé: '+name);
    if(digest(fs.readFileSync(path.join(root,name)))!==digest(template))throw Error('Studio public incomplet: '+name);
  }
  return {publicPages:FILES,publicSha256:digest(template),testPagesUnchanged:true,originalSourceDigests:expected};
}
module.exports={stage};
if(require.main===module)console.log(JSON.stringify(stage(process.argv[2]),null,2));
