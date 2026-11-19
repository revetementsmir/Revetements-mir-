'use strict';
// Only imports an existing durable key. It never creates a signing identity.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');

const REQUIRED = ['MIR_PREVIEW_KEYSTORE_BASE64', 'MIR_PREVIEW_KEYSTORE_PASSWORD', 'MIR_PREVIEW_KEY_ALIAS', 'MIR_PREVIEW_KEY_PASSWORD', 'MIR_PREVIEW_CERT_SHA256'];
function fingerprint(value) {
  const normalized = String(value || '').replaceAll(':', '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(normalized)) throw Error('Empreinte publique de signature MIR Aperçu absente ou invalide.');
  return normalized;
}
function validateContext(env) {
  if (env.GITHUB_REPOSITORY !== 'revetementsmir/Revetements-mir-'
      || env.MIR_PREVIEW_SOURCE_REPOSITORY !== env.GITHUB_REPOSITORY
      || !/^[a-f0-9]{40}$/.test(env.MIR_PREVIEW_SOURCE_SHA || '')
      || env.MIR_PREVIEW_SOURCE_SHA !== env.MIR_PREVIEW_SIGNING_APPROVED_SHA) {
    throw Error('Signature MIR Aperçu refusée : dépôt et SHA exact revu requis.');
  }
  for (const key of REQUIRED) {
    if (!env[key] || /[\r\n\0]/.test(env[key])) throw Error('Configuration privée de signature MIR Aperçu incomplète ou invalide.');
  }
  fingerprint(env.MIR_PREVIEW_CERT_SHA256);
  const encoded = env.MIR_PREVIEW_KEYSTORE_BASE64;
  if (encoded.length > 350000 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw Error('Format du keystore MIR Aperçu invalide.');
  }
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(env.MIR_PREVIEW_KEY_ALIAS)) throw Error('Alias de signature MIR Aperçu invalide.');
}
function importKey(env) {
  validateContext(env);
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'});
  if (head.status !== 0 || head.stdout.trim() !== env.MIR_PREVIEW_SOURCE_SHA) throw Error('La source extraite ne correspond pas au SHA autorisé.');
  if (!path.isAbsolute(env.RUNNER_TEMP || '') || !path.isAbsolute(env.GITHUB_ENV || '')) throw Error('Répertoire temporaire du runner requis.');
  const temp = fs.realpathSync(env.RUNNER_TEMP);
  const workspace = fs.realpathSync(env.GITHUB_WORKSPACE || process.cwd());
  if (temp === workspace || temp.startsWith(workspace + path.sep)) throw Error('Le keystore doit rester hors du workspace et des artefacts.');
  const directory = fs.mkdtempSync(path.join(temp, 'mir-preview-signing-'));
  fs.chmodSync(directory, 0o700);
  const keyFile = path.join(directory, 'preview.p12');
  const bytes = Buffer.from(env.MIR_PREVIEW_KEYSTORE_BASE64, 'base64');
  try {
    fs.writeFileSync(keyFile, bytes, {flag: 'wx', mode: 0o600});
    // Only paths enter GITHUB_ENV. Passwords remain scoped to the signing step.
    fs.appendFileSync(env.GITHUB_ENV, 'MIR_PREVIEW_KEYSTORE_PATH=' + keyFile + '\nMIR_PREVIEW_SIGNING_DIRECTORY=' + directory + '\n');
  } catch (error) {
    fs.rmSync(directory, {recursive: true, force: true});
    throw Error('Import privé de la signature MIR Aperçu refusé.');
  } finally {
    bytes.fill(0);
  }
  console.log('Signature MIR Aperçu importée dans le répertoire privé temporaire du runner.');
}
function cleanup(env) {
  if (!env.MIR_PREVIEW_SIGNING_DIRECTORY) return;
  const temp = fs.realpathSync(env.RUNNER_TEMP);
  const directory = path.resolve(env.MIR_PREVIEW_SIGNING_DIRECTORY);
  if (path.dirname(directory) !== temp || !/^mir-preview-signing-[A-Za-z0-9]+$/.test(path.basename(directory))) throw Error('Nettoyage hors du répertoire privé de signature refusé.');
  fs.rmSync(directory, {recursive: true, force: true});
  console.log('Fichier privé de signature retiré du runner.');
}
module.exports = {fingerprint, validateContext, importKey, cleanup};
if (require.main === module) {
  try {
    if (process.argv[2] === 'import') importKey(process.env);
    else if (process.argv[2] === 'clean') cleanup(process.env);
    else throw Error('Commande de signature attendue : import ou clean.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
