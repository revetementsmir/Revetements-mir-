'use strict';
// Run existing Chrome-channel assertions on the installed Chromium, explicitly.
// No assertion or application feature is overridden. One test file per process.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const bin=process.env.MIR_CHROMIUM_BIN||'/usr/bin/chromium';
if(!fs.existsSync(bin))throw new Error('Chromium absent : renseigner MIR_CHROMIUM_BIN');
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>{const opts={...options,executablePath:bin};delete opts.channel;return launch(opts);};
const file=path.resolve(process.argv[2]||'');
if(!file.startsWith(path.resolve(__dirname,'../tests')+path.sep)||!file.endsWith('.cjs'))throw new Error('Fichier de test MIR requis');
console.log('Navigateur de recette : '+bin);
require(file);
