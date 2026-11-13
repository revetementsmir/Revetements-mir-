'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const config=require('./apk-preview/source.json'),repo=path.resolve(__dirname,'..');
function build(source,output){
 source=path.resolve(source);output=path.resolve(output);
 if(fs.existsSync(output)||!output.endsWith(path.sep+'test'+path.sep+'application'))throw Error('New isolated /test/application output required');
 const commit=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim();
 if(commit!==config.sourceRef)throw Error('APK source revision mismatch');
 const www=path.join(source,'mobile/www');
 if(!fs.existsSync(path.join(www,'mir-native-sdk.js')))throw Error('Build the certified mobile web resources first');
 fs.cpSync(www,output,{recursive:true});
 const write=(name,value)=>fs.writeFileSync(path.join(output,name),value);
 // Reuse TEST isolation without adding its web-only visual banner to the APK UI.
 let guard=fs.readFileSync(path.join(repo,'dist/mir-test-guard.js'),'utf8');
 guard=guard.replace("prefix='mir-test:","prefix='mir-apk-preview:").replace("root.pathname.endsWith('/test/')","root.pathname.endsWith('/test/application/')");
 guard=guard.replace(/function banner\(\)\{[\s\S]*?\n if\(window.MIRTestEnvironment\)/,'function banner(){}\n if(window.MIRTestEnvironment)');
 write('mir-apk-preview-guard.js',guard);write('mir-apk-browser-bridge.js',fs.readFileSync(path.join(__dirname,'apk-preview/browser-bridge.js')));
 // The packaged localhost origin becomes the hosted preview origin. Auth
 // options, TEST endpoint and the original role-checking SDK stay unchanged.
 let portal=fs.readFileSync(path.join(www,'portal-config.js'),'utf8');
 portal=portal.replace(/"siteOrigin":"[^"]*"/, '"siteOrigin":location.origin').replace(/"callbackPath":"[^"]*"/, '\"callbackPath\":(location.origin===\"https://revetementsmir.github.io\"?\"/Revetements-mir-/chantier.html\":\"/chantier.html\")');
 write('portal-config.js',portal);
 const policy=require(path.join(source,'mobile/web/policy.cjs'));
 // Only the shell's browser capabilities differ; its UI controllers and styles
 // still come from the same revision used to build the certified APK.
 let bootstrap=fs.readFileSync(path.join(source,'mobile/web/bootstrap.js'),'utf8');
 bootstrap=bootstrap.replace("import {registerPlugin} from '@capacitor/core';",'const {Native,App,Geolocation}=window.MIRAPKPreview;').replace("import {App} from '@capacitor/app';",'').replace("import {Geolocation} from '@capacitor/geolocation';",'').replace("const Native=registerPlugin('MIRNative');",'');
 bootstrap=bootstrap.replace("import Policy from './policy.cjs';",`import OriginalPolicy from './policy.cjs';
const previewRoot=window.MIRAPKPreview.root;
const Policy={...OriginalPolicy,allowedRequest(value,origin){try{const u=new URL(value,location.href);if(u.origin==='https://atelier.atelier-app-001.workers.dev'&&u.pathname.startsWith('/responsive/'))return true;return OriginalPolicy.allowedRequest(u.href,origin);}catch{return false;}},allowedRoute(value,origin){try{const u=new URL(value,location.href);if(u.origin!==location.origin||!u.pathname.startsWith(previewRoot.pathname))return false;u.pathname='/'+u.pathname.slice(previewRoot.pathname.length);return OriginalPolicy.allowedRoute(u.href,origin);}catch{return false;}}};`);
 const marker="document.addEventListener('click',async event=>{";
 if(!bootstrap.includes(marker))throw Error('Native click guard changed; review browser adapter');
 bootstrap=bootstrap.replace(marker,marker+"\n if(!event.target.closest?.('[data-mir-responsive-page]'))return;");
 bootstrap=bootstrap.replace('observer.observe(document.body,{childList:true,subtree:true});',"observer.observe(document.body,{childList:true,subtree:true});window.MIRAPKPreview.uiReady=true;document.dispatchEvent(new Event('mir-apk-ui-ready'));");
 const esbuild=require(path.join(source,'mobile/node_modules/esbuild'));
 esbuild.buildSync({stdin:{contents:bootstrap,resolveDir:path.join(source,'mobile/web')},outfile:path.join(output,'mir-native-bootstrap.js'),bundle:true,format:'iife',target:'es2022'});
 const csp=`default-src 'self'; script-src 'self' 'unsafe-inline' https://atelier.atelier-app-001.workers.dev; style-src 'self' 'unsafe-inline' https://atelier.atelier-app-001.workers.dev; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: https://${policy.TEST} wss://${policy.TEST} https://atelier.atelier-app-001.workers.dev; worker-src 'self' blob:; media-src 'self' blob:; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'self'`;
 for(const name of fs.readdirSync(output).filter(n=>n.endsWith('.html'))){let html=fs.readFileSync(path.join(output,name),'utf8');html=html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi,'').replace(/<head([^>]*)>/i,`<head$1><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="${csp}"><script src="mir-apk-preview-guard.js"></script><script src="mir-apk-browser-bridge.js"></script>`);write(name,html);}
 for(const name of ['mir-responsive-styles.mjs','mir-responsive-history.js'])fs.copyFileSync(path.join(repo,'dist',name),path.join(output,name));
 let loader=fs.readFileSync(path.join(repo,'dist/responsive.html'),'utf8');
 const policyCode=fs.readFileSync(path.join(source,'mobile/web/policy.cjs'),'utf8');
 loader=loader.replace("if (!pages.has(page))",`const nativePolicy=(()=>{const module={exports:{}};${policyCode};return module.exports;})();const nativeURL=new URL(page,'https://localhost/');nativeURL.search=location.search;if(!nativePolicy.allowedRoute(nativeURL.href))throw Error('Ce parcours est refusé par la politique de l’APK.');\n      if (!pages.has(page))`);
 loader=loader.replace(/const pages = new Set\(\[[^;]+;/,"const pages = new Set(['chantier.html','entrepot.html','coordination.html','production.html','calepinage.html','espace-partage.html']);").replace("|| 'index.html'","|| 'chantier.html'");
 loader=loader.replace("const page = new URL(location.href).searchParams.get('page') || 'chantier.html';","const page = new URL(location.href).searchParams.get('page') || 'chantier.html';");
 // Entry redirection is for the website launcher, never for this app renderer.
 loader=loader.replace(/\/\* APK_APPLICATION_REDIRECT_START \*\/[\s\S]*?\/\* APK_APPLICATION_REDIRECT_END \*\//,'');
 write('responsive.html',loader);
 let adapter=fs.readFileSync(path.join(repo,'dist/mir-responsive-adapter.mjs'),'utf8');
 adapter="if(!window.MIRAPKPreview.uiReady)await new Promise(resolve=>document.addEventListener('mir-apk-ui-ready',resolve,{once:true}));\n"+adapter;
 adapter=adapter.replace(/\/\* APK_APPLICATION_LAUNCH_START \*\/[\s\S]*?\/\* APK_APPLICATION_LAUNCH_END \*\//,'');
 adapter=adapter.replace("import {mountEnvironmentSwitch} from './mir-responsive-environments.mjs';","import source from './mir-apk-preview-source.mjs';\nconst mountEnvironmentSwitch=()=>()=>{};");
 adapter=adapter.replace("||'index.html'","||'chantier.html'");
 adapter=adapter.replace("font:16px/1.5 Arial,sans-serif", "");
 adapter=adapter.replace("const syncClasses=()=>{page.className=", "const syncClasses=()=>{for(const root of [document.documentElement,document.body])for(const attr of root.attributes)if(/^data-(mir-(?:harmony|theme|text|contrast|motion)|portal-)/.test(attr.name))page.setAttribute(attr.name,attr.value);page.className=");
 adapter=adapter.replaceAll("{attributes:true,attributeFilter:['class']}","{attributes:true}");
 adapter=adapter.replace("const query=new URLSearchParams(location.search);","const query=new URLSearchParams(location.search);query.set('app-preview','1');query.set('app-platform','android');if(!query.has('phone'))query.set('phone','galaxy-s26-ultra');");
 adapter=adapter.replace("projectId:PROJECT,title:'Les Revêtements MIR',query,",`projectId:PROJECT+'-android-test',title:'MIR · Application Android TEST',query,
    application:{available:true,platforms:{android:true,apple:false},environments:{android:{test:location.href,production:null},apple:{test:null,production:null}}},
    interfaces:{initial:'application',items:[{id:'application',label:'Application'},{id:'website',label:'Site web'}],onChange(id){if(id==='website'){const u=new URL('../../responsive.html',location.href);u.search='?page=chantier.html&layout=phone';location.assign(u.href);}}},
    environments:{test:location.href,current:'test'},`);
 adapter=adapter.replace("notice.textContent='Vrais écrans MIR · une vue active à la fois. Les vues simultanées nécessitent encore des contrôleurs indépendants. Annotations en mémoire : copier avant de changer de page.';","notice.textContent='Sources APK Android TEST '+source.versionCode+' · annotations → sources APK · une vue active à la fois';");
 adapter=adapter.replace("title:'Les Revêtements MIR',service:","title:'MIR — CORRIGER LES SOURCES APK ANDROID (PR31), PUIS RECOMPILER — PAS LE SITE SEUL',service:");
 adapter=adapter.replace("const syncClasses=", "window.MIRAPKPreview.getAnnotations=()=>board.getAnnotations();\n  const syncClasses=");
 adapter=adapter.replace("interface:current,device:","interface:'Application Android TEST · '+current+' · APK PR31',revision:'APK '+source.sourceRef+' | dist/'+current+' | mobile/web/team.css | PR31: corriger sources puis recompiler APK',device:");
 adapter=adapter.replace("if(!allowed.has(name))return;event.preventDefault();","if(!allowed.has(name))return;event.preventDefault();");
 adapter=adapter.replace("target.searchParams.set('page',name);","target.searchParams.set('page',name);target.searchParams.set('app-preview','1');target.searchParams.set('app-platform','android');");
 write('mir-responsive-adapter.mjs',adapter);write('mir-apk-preview-source.mjs','export default '+JSON.stringify(config)+';\n');
 const unchanged=['team.css','mir-native-sdk.js','chantier-app.js','portal-client.js','mir-harmony.css'];
 const hashes={};for(const name of unchanged){const a=fs.readFileSync(path.join(www,name)),b=fs.readFileSync(path.join(output,name));if(!a.equals(b))throw Error('APK UI source differs: '+name);hashes[name]=crypto.createHash('sha256').update(b).digest('hex');}
 write('mir-apk-preview.json',JSON.stringify({...config,preview:'same-source-browser',nativeCapabilities:false,uiSHA256:hashes},null,2)+'\n');
 return hashes;
}
module.exports={build};if(require.main===module)console.log(JSON.stringify(build(process.argv[2],process.argv[3])));
