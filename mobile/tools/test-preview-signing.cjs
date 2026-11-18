'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {fingerprint, validateContext, cleanup} = require('./preview-signing.cjs');
const {readSigner, readPackage} = require('./verify-preview-signing.cjs');
const Flow = require('../web/auth-flow.cjs');
const root = path.resolve(__dirname, '..');
const appId = 'ca.revetementsmir.equipe.test.preview';
const expected = '12'.repeat(32);
const sha = 'ab'.repeat(20);
const configuration = () => ({GITHUB_REPOSITORY: 'revetementsmir/Revetements-mir-', MIR_PREVIEW_SOURCE_REPOSITORY: 'revetementsmir/Revetements-mir-', MIR_PREVIEW_SOURCE_SHA: sha, MIR_PREVIEW_SIGNING_APPROVED_SHA: sha, MIR_PREVIEW_CERT_SHA256: expected, MIR_PREVIEW_KEYSTORE_BASE64: Buffer.from('not-a-keystore-test-fixture').toString('base64'), MIR_PREVIEW_KEYSTORE_PASSWORD: 'fixture-store-value', MIR_PREVIEW_KEY_ALIAS: 'preview-fixture', MIR_PREVIEW_KEY_PASSWORD: 'fixture-key-value'});

test('a foreign repository, unreviewed revision or absent signing value cannot import a key', () => {
  assert.doesNotThrow(() => validateContext(configuration()));
  for (const key of Object.keys(configuration())) {
    const env = configuration(); delete env[key];
    assert.throws(() => validateContext(env), undefined, key);
  }
  for (const replacement of [{MIR_PREVIEW_SOURCE_REPOSITORY: 'other/fork'}, {MIR_PREVIEW_SOURCE_SHA: 'cd'.repeat(20)}, {MIR_PREVIEW_KEYSTORE_BASE64: 'invalid\nbase64'}, {MIR_PREVIEW_KEY_ALIAS: 'alias\nINJECTED=value'}]) {
    assert.throws(() => validateContext({...configuration(), ...replacement}));
  }
});

test('signature verification refuses a different signer, several signers or an unverified v2 signature', () => {
  const output = 'Verified using v2 scheme (APK Signature Scheme v2): true\nSigner #1 certificate SHA-256 digest: ' + expected + '\n';
  assert.equal(readSigner(output, expected), expected);
  assert.equal(fingerprint(expected.toUpperCase().match(/../g).join(':')), expected);
  assert.throws(() => readSigner(output, '34'.repeat(32)), /différent/);
  assert.throws(() => readSigner(output + 'Signer #2 certificate SHA-256 digest: ' + expected + '\n', expected), /différent/);
  assert.throws(() => readSigner(output.replace(': true', ': false'), expected), /non vérifiée/);
  assert.throws(() => readSigner('', expected));
});

test('the delivery package cannot be confused with the previous installation or an instrumentation APK', () => {
  const output = "package: name='" + appId + "' versionCode='130006' versionName='0.13.3-test' platformBuildVersionName='16'\napplication-label:'MIR TEST Aperçu'\n";
  assert.equal(readPackage(output, 130006).applicationId, appId);
  assert.throws(() => readPackage(output.replace('.test.preview', '.test'), 130006));
  assert.throws(() => readPackage(output, 130005));
  assert.throws(() => readPackage(output.replace('MIR TEST Aperçu', 'MIR TEST'), 130006));
  const instrumentation = output.replace(appId, appId + '.test');
  assert.equal(readPackage(instrumentation, null, true).applicationId, appId + '.test');
  assert.throws(() => readPackage(instrumentation, 130006));
});

test('an unversioned instrumentation APK is valid while delivery APKs still require their exact version', () => {
  const output = "package: name='" + appId + ".test' versionCode='' versionName='' platformBuildVersionName='16'\n";
  assert.deepEqual(readPackage(output, null, true), {applicationId: appId + '.test', versionCode: null, versionName: ''});
  assert.throws(() => readPackage(output, 130006));
  const unversionedApp = output.replace(appId + '.test', appId) + "application-label:'MIR TEST Aperçu'\n";
  assert.throws(() => readPackage(unversionedApp, 130006));
  assert.throws(() => readPackage(unversionedApp, null));
  assert.throws(() => readPackage(output.replace("versionCode=''", "versionCode='not-a-number'"), null, true));
  assert.throws(() => readPackage(output.replace(appId + '.test', 'ca.revetementsmir.equipe.test.test'), null, true));
});

test('cleanup is restricted to the private signing directory of this runner', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mir-preview-cleanup-test-'));
  try {
    const directory = fs.mkdtempSync(path.join(temp, 'mir-preview-signing-'));
    fs.writeFileSync(path.join(directory, 'placeholder'), 'synthetic fixture');
    assert.throws(() => cleanup({RUNNER_TEMP: temp, MIR_PREVIEW_SIGNING_DIRECTORY: temp}));
    assert.ok(fs.existsSync(directory));
    cleanup({RUNNER_TEMP: temp, MIR_PREVIEW_SIGNING_DIRECTORY: directory});
    assert.equal(fs.existsSync(directory), false);
  } finally { fs.rmSync(temp, {recursive: true, force: true}); }
});

test('Android identity, browser callback and native OAuth guard agree on the separate preview app', () => {
  const config = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
  assert.equal(config.appId, appId); assert.equal(config.appName, 'MIR TEST Aperçu');
  const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8');
  assert.match(gradle, /namespace = "ca\.revetementsmir\.equipe\.test"/);
  assert.match(gradle, /applicationId "ca\.revetementsmir\.equipe\.test\.preview"/);
  const manifest = fs.readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
  assert.match(manifest, /android:scheme="mirtestpreview" android:host="auth" android:path="\/callback"/);
  assert.doesNotMatch(manifest, /android:scheme="mirtest"/);
  assert.ok(manifest.includes('android:authorities="${applicationId}.fileprovider"'));
  assert.equal(Flow.CALLBACK, 'mirtestpreview://auth/callback');
  assert.equal(Flow.callback('mirtest://auth/callback?flow=google&code=old'), null);
  const plugin = fs.readFileSync(path.join(root, 'android/app/src/main/java/ca/revetementsmir/equipe/test/MIRNativePlugin.java'), 'utf8');
  assert.ok(plugin.includes('String redirect="' + Flow.CALLBACK + '?flow=google";'));
  const strings = fs.readFileSync(path.join(root, 'android/app/src/main/res/values/strings.xml'), 'utf8');
  assert.match(strings, /name="app_name">MIR TEST Aperçu</);
  const shortcut = fs.readFileSync(path.join(root, 'android/app/src/debug/res/xml/device_shortcuts.xml'), 'utf8');
  assert.ok(shortcut.includes('android:targetPackage="' + appId + '"'));
  assert.ok(shortcut.includes('android:targetClass="ca.revetementsmir.equipe.test.MainActivity"'));
});
