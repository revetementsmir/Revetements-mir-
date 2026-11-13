'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'mobile/android/app/src/androidTest/assets');
fs.mkdirSync(out,{recursive:true});
fs.copyFileSync(path.join(root,'docs/verification/phase10-bending/MIR-phase10-4-profils.pdf'),path.join(out,'phase10-four.pdf'));
