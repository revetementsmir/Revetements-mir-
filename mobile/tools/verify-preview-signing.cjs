'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const {fingerprint} = require('./preview-signing.cjs');
const APPLICATION_ID = 'ca.revetementsmir.equipe.test.preview';

function readSigner(output, expected) {
  const digests = [...output.matchAll(/^Signer #\d+ certificate SHA-256 digest:\s*([a-fA-F0-9:]+)\s*$/gm)];
  if (digests.length !== 1 || fingerprint(digests[0][1]) !== fingerprint(expected)) throw Error('Certificat MIR Aperçu différent de l’empreinte publique attendue.');
  if (!/^Verified using v2 scheme .*: true\s*$/m.test(output)) throw Error('Signature APK v2 MIR Aperçu non vérifiée.');
  return fingerprint(digests[0][1]);
}
function readPackage(output, expectedCode, instrumentation = false) {
  // AAPT emits an empty versionCode when an instrumentation manifest has none.
  // Keep that absence explicit; it must never pass as a user-facing APK version.
  const match = output.match(/^package: name='([^']+)' versionCode='(\d*)' versionName='([^']*)'/m);
  const expectedId = APPLICATION_ID + (instrumentation ? '.test' : '');
  const versionCode = match && match[2] !== '' ? Number(match[2]) : null;
  if (!match || match[1] !== expectedId || (!instrumentation && versionCode === null) || (expectedCode !== null && versionCode !== expectedCode)) {
    const observed = match ? match[1] + ', versionCode=' + (match[2] || '(absent)') : 'en-tête AAPT non reconnu';
    throw Error('Identité ou version de l’APK MIR Aperçu inattendue : attendu ' + expectedId + (expectedCode === null ? '' : ', versionCode=' + expectedCode) + '; reçu ' + observed + '.');
  }
  if (!instrumentation && !/^application-label:'MIR TEST Aperçu'\s*$/m.test(output)) throw Error('Nom du lanceur MIR TEST Aperçu absent.');
  return {applicationId: match[1], versionCode, versionName: match[3]};
}
function verifyOne(file, expectedCode, expected, tools, instrumentation = false) {
  const signature = spawnSync(path.join(tools, 'apksigner'), ['verify', '--verbose', '--print-certs', file], {encoding: 'utf8'});
  if (signature.status !== 0) throw Error('Vérification cryptographique de l’APK MIR Aperçu refusée.');
  const certificateSha256 = readSigner(signature.stdout, expected);
  const manifest = spawnSync(path.join(tools, 'aapt'), ['dump', 'badging', file], {encoding: 'utf8'});
  if (manifest.status !== 0) throw Error('Lecture du manifeste de l’APK MIR Aperçu refusée.');
  let identity;
  try { identity = readPackage(manifest.stdout, expectedCode, instrumentation); }
  catch (error) { throw Error(path.basename(file) + ' : ' + error.message); }
  return {...identity, file: path.basename(file), certificateSha256, apkSha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), cryptographicVerification: true};
}
function verify(env, args) {
  if (args.length !== 4) throw Error('APK initial, APK final, APK de test et rapport de signature requis.');
  const expected = fingerprint(env.MIR_PREVIEW_CERT_SHA256);
  const sdk = env.ANDROID_HOME || env.ANDROID_SDK_ROOT;
  if (!sdk || !path.isAbsolute(sdk)) throw Error('SDK Android requis pour vérifier la signature.');
  const tools = path.join(sdk, 'build-tools/36.0.0');
  const [before, after, test, reportFile] = args;
  const proofs = [verifyOne(before, 130009, expected, tools), verifyOne(after, 130010, expected, tools), verifyOne(test, null, expected, tools, true)];
  const report = {sourceSha: env.MIR_PREVIEW_SOURCE_SHA, applicationId: APPLICATION_ID, signature: 'durable MIR TEST Aperçu', expectedCertificateSha256: expected, buildType: 'debug', production: false, existingInstallationReplaced: false, previousApplicationId: 'ca.revetementsmir.equipe.test', proofs};
  fs.mkdirSync(path.dirname(reportFile), {recursive: true});
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
  console.log('Trois APK MIR Aperçu : signature cryptographique, certificat durable, identité et versions vérifiés.');
}
module.exports = {readSigner, readPackage, verifyOne, verify};
if (require.main === module) {
  try { verify(process.env, process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
