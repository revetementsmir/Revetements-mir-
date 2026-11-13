'use strict';
const TEST=Object.freeze({
 projectRef:'hxtztkmbfpmzrieccwsg',
 supabaseUrl:'https://hxtztkmbfpmzrieccwsg.supabase.co',
 publishableKey:'sb_publishable_jk8zsTWqQi6Borv44aaDJw_k7JSbzZh'
});
function assertMirTestConfig(config){
 if(!config||config.environment!=='test'||config.projectRef!==TEST.projectRef||config.supabaseUrl!==TEST.supabaseUrl||config.publishableKey!==TEST.publishableKey)throw Error('MIR TEST preflight refused: exact TEST configuration required');
 return true;
}
module.exports={TEST,assertMirTestConfig};
