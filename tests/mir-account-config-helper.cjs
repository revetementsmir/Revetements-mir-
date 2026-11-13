'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
module.exports=function accountConfig({file=path.join(__dirname,'../dist/portal-config.js'),test=false}={}){
 const sandbox={window:{},location:{search:test?'?recette=1':''},URLSearchParams};vm.runInNewContext(fs.readFileSync(file,'utf8'),sandbox);return sandbox.window.MIRPortalConfig;
};
