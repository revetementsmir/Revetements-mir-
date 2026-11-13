"""Capture missing Android evidence, using the original certified APK unchanged.

No business submission, root, resigning, preference change, image-in-log or public
image commit. All UI interaction occurs on a fresh CI emulator. Credentials and
raw accessibility trees are never printed or archived. Screens remain artifacts.
"""
import argparse
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import struct
import subprocess
import sys
import time

APP = 'ca.revetementsmir.equipe.test'
SOURCE = 'd1876c75b8ec97e52e56a6e535f0cfa00c7e362c'
APK_SHA = 'e5b025382a29e05cab0b1640a8523c2fec296d2e245e6d5a7cb85cd9e015cdbb'
RUN = 43522576473
TEST = 'hxtztkmbfpmzrieccwsg'
ROLES = [('EMPLOYEE', 'Employé chantier'), ('CHEF', 'Chef d’équipe'),
         ('WAREHOUSE', 'Entrepôt et livraison'), ('ASSISTANT', 'Adjointe'), ('BOSS', 'Boss')]
SAFE_NAV = {'Me connecter', 'Menu', 'Réglages', 'Déconnexion', 'Plus', 'Mes absences'}
class CaptureError(RuntimeError):
    """Only static, non-sensitive diagnostic messages may be logged."""


REQUIRED_OLD = {'android-signin-portrait.png', 'android-dark-large-contrast.png',
                'android-signin-landscape.png', 'android-keyboard.png',
                'android-offline.png', 'android-pdf-four-pages.png', 'android-device-recipe.png'}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def certified_apk(root):
    matches = list(root.rglob('MIR-TEST-debug.apk'))
    if len(matches) != 1:
        raise CaptureError('Exactly one certified APK is required')
    apk = matches[0]
    if sha(apk) != APK_SHA:
        raise CaptureError('Certified APK SHA-256 mismatch')
    folder = apk.parent
    if (folder / 'pr-head-sha.txt').read_text().strip() != SOURCE:
        raise CaptureError('Certified source mismatch')
    result = json.loads((folder / 'result.json').read_text())
    if (result['source'] != SOURCE or result['project'] != TEST
            or result['versionCode'] != 110002 or result['nativeTests'] != 6):
        raise CaptureError('Certified result metadata mismatch')
    import zipfile
    with zipfile.ZipFile(apk) as package:
        for filename in ['portal-config.js', 'shared-config.js', 'mir-estimate-config.js']:
            content = package.read('assets/public/' + filename).decode()
            if 'gccltmaulvrnthrbnrpd' in content:
                raise CaptureError('Production configuration refused')
            if filename == 'mir-estimate-config.js' and 'enabled:false' not in content:
                raise CaptureError('Estimate transport must remain disabled')
            if filename != 'mir-estimate-config.js' and TEST not in content:
                raise CaptureError('Fixed TEST configuration missing')
        config = json.loads(package.read('assets/capacitor.config.json'))
        if config.get('server', {}).get('url'):
            raise CaptureError('Remote server.url refused')
    return apk


def png_info(path):
    data = path.read_bytes()
    if data[:8] != b'\x89PNG\r\n\x1a\n':
        raise CaptureError('Native screenshot is not PNG')
    width, height = struct.unpack('>II', data[16:24])
    return {'sha256': hashlib.sha256(data).hexdigest(), 'width': width,
            'height': height, 'bytes': len(data)}


class Capture:
    def __init__(self, root, output, serial, generator):
        self.root, self.output, self.serial = root, output, serial
        self.stage = 'verify-certified-apk'
        self.apk = certified_apk(root)
        self.output.mkdir(parents=True, exist_ok=True)
        self.manifest = {'apk_source': SOURCE, 'apk_sha256': APK_SHA, 'versionCode': 110002,
                         'versionName': '0.11.0-test', 'certified_run': RUN,
                         'generator_sha': generator, 'project': TEST, 'screens': [],
                         'physical_device': False, 'business_submission': False,
                         'visual_inspection': 'pending-human-or-assistant-image-review'}
        self.device = None

    def adb(self, *args):
        # No shell interpolation and no credential value ever passed to this helper.
        result = subprocess.run(['adb', '-s', self.serial, *args], capture_output=True, timeout=40)
        if result.returncode:
            raise CaptureError('ADB operation failed')
        return result.stdout

    def save_manifest(self, status):
        self.manifest['generation_status'] = status
        self.manifest['last_stage'] = self.stage
        (self.output / 'manifest.json').write_text(json.dumps(self.manifest, indent=2) + '\n')

    def originals(self):
        import shutil
        originals = [p for p in self.root.rglob('*.png') if 'phase11-proof' in p.parts and not p.stem.endswith('-scaled')]
        if not REQUIRED_OLD.issubset({p.name for p in originals}):
            raise CaptureError('Certified screenshots missing from original artifact')
        target = self.output / 'certified-original'
        target.mkdir(exist_ok=True)
        for source in sorted(originals):
            path = target / source.name
            if path.exists():
                raise CaptureError('Duplicate original screenshot name')
            shutil.copyfile(source, path)
            updated = source.name.startswith('v110002-')
            self.manifest['screens'].append({'file': str(path.relative_to(self.output)),
                'origin': 'certified-instrumentation', 'source_run': RUN, 'source_sha': SOURCE,
                'apk_versionCode': 110002 if updated else 110001,
                'binary_sha256': APK_SHA if updated else None,
                'note': ('Real-role matrix ran after the certified update on the archived 110002 APK.'
                         if updated else 'Original tests ran before the certified 110001 to 110002 update; 110001 binary was not archived.'),
                'scaled': source.stem.endswith('-scaled'), **png_info(path)})

    def wait(self, predicate, label, seconds=30):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            if predicate():
                return
            time.sleep(.25)
        raise CaptureError('UI state not reached: ' + label)

    def tap(self, label):
        if label not in SAFE_NAV:
            raise CaptureError('Non-allowlisted UI action refused')
        if label == 'Menu':
            # WebView may expose aria-label in text OR content-desc.
            candidates = [self.device(descriptionContains='menu MIR'),
                          self.device(textMatches='(?:Ouvrir|Fermer) le menu MIR'),
                          self.device(text='Menu')]
        else:
            candidates = [(self.device(textStartsWith=label) if label == 'Mes absences'
                           else self.device(text=label))]
        self.wait(lambda: any(item.count == 1 for item in candidates),
                  'navigation control ' + label, seconds=10)
        selector = next(item for item in candidates if item.count == 1)
        selector.click(timeout=10)
        time.sleep(.4)

    def top(self):
        for _ in range(3):
            self.device.swipe_ext('down', scale=.8)
        time.sleep(.3)

    def shot(self, name, role, scenario):
        if not re.fullmatch('[a-z0-9-]+', name):
            raise CaptureError('Invalid screenshot name')
        if self.device.app_current().get('package') != APP:
            raise CaptureError('MIR is not foreground for screenshot')
        path = self.output / (name + '.png')
        if path.exists():
            raise CaptureError('Existing screenshot must not be overwritten')
        # Lossless native capture including Android status/navigation bars; never stdout/logs.
        with path.open('wb') as stream:
            result = subprocess.run(['adb', '-s', self.serial, 'exec-out', 'screencap', '-p'],
                                    stdout=stream, stderr=subprocess.PIPE, timeout=30)
        if result.returncode:
            raise CaptureError('Native screenshot failed')
        self.manifest['screens'].append({'file': path.name, 'origin': 'uiautomator-certified-apk',
            'apk_versionCode': 110002, 'binary_sha256': APK_SHA, 'source_sha': SOURCE,
            'role': role, 'scenario': scenario, **png_info(path)})
        self.save_manifest('in-progress')

    def login(self, key, label, home_name=None):
        self.stage = key.lower() + '-login'
        email, password = (os.environ.get('MIR_SANDBOX_' + key + '_' + suffix)
                           for suffix in ('EMAIL', 'PASSWORD'))
        if not email or not password:
            raise CaptureError('Required TEST account missing')
        self.wait(lambda: self.device(text='Me connecter').exists, 'team sign-in')
        fields = self.device(className='android.widget.EditText')
        if fields.count != 2:
            raise CaptureError('Unexpected sign-in fields')
        fields[0].set_text(email)
        fields[1].set_text(password)
        # Accessibility actions do not require IME injection or a signature bypass.
        self.tap('Me connecter')
        self.wait(lambda: self.device(textContains=label).exists
                  and self.device(text='Déconnexion').exists, 'server role label')
        self.top()
        self.shot(home_name or key.lower() + '-home', label, 'Authenticated landing and system bars')

    def menu(self, key, label):
        self.stage = key.lower() + '-menu'
        self.tap('Menu')
        self.shot(key.lower() + '-menu', label, 'Business navigation menu')
        self.tap('Menu')

    def settings(self, key, label):
        self.stage = key.lower() + '-settings'
        self.tap('Réglages')
        self.wait(lambda: self.device(textContains='Apparence').exists, 'settings form')
        self.wait(lambda: self.device(text='Enregistré dans votre compte MIR').exists, 'settings response complete')
        self.shot(key.lower() + '-settings', label, 'Settings form, read only; no preference changed')

    def employee_form_and_back(self):
        self.stage = 'employee-local-form-and-back'
        self.top()
        self.tap('Menu')
        self.tap('Plus')
        self.wait(lambda: self.device(textStartsWith='Mes absences').exists, 'personal tools')
        self.tap('Mes absences')
        self.wait(lambda: self.device(text='Nouvelle demande').exists, 'absence form')
        self.shot('employee-absence-form', 'Employé chantier', 'Unsaved absence form; no submit')
        # The last field is the note textarea (source audited); no draft/save button is clicked.
        # WebView exposes the label separately from an empty textarea. Do not
        # require the label to be repeated in the field's text/content-desc.
        # Source-audited note is the only editable field between its label and
        # the save button; never click that button.
        def note_field():
            labels = self.device(text='Motif ou commentaire')
            save = self.device(text='Enregistrer le brouillon')
            if labels.count != 1 or save.count != 1:
                return None
            lower = labels.info['bounds']['top']
            upper = save.info['bounds']['top']
            edits = self.device(className='android.widget.EditText')
            fields = [edits[index] for index in range(edits.count)
                      if edits[index].info['bounds']['top'] >= lower
                      and edits[index].info['bounds']['bottom'] <= upper]
            return fields[0] if len(fields) == 1 else None
        note = note_field()
        for _ in range(6):
            if note is not None:
                break
            self.device.swipe_ext('up', scale=.5)
            note = note_field()
        if note is None:
            raise CaptureError('Uniquely labelled local note field not found')
        if note.info.get('password'):
            raise CaptureError('Password field refused for local form probe')
        note.click()
        note.set_text('RECETTE-PHASE11-VISUEL-LOCAL')
        self.shot('employee-local-note', 'Employé chantier', 'Local note only, no server save')
        self.device.press('back')
        time.sleep(.5)
        cancel = self.device(resourceId='android:id/button2')
        if not cancel.exists:
            self.device.press('back')
        self.wait(lambda: cancel.exists, 'Android unsaved-input confirmation', seconds=5)
        self.shot('employee-back-confirmation', 'Employé chantier', 'Android back confirmation, before cancel')
        cancel.click()
        self.wait(lambda: self.device(text='RECETTE-PHASE11-VISUEL-LOCAL').exists,
                  'local note retained after cancelling back')

    def run(self):
        import uiautomator2 as u2
        logging.disable(logging.CRITICAL)  # No credential-bearing JSON-RPC diagnostics in CI logs.
        self.originals()
        self.adb('install', str(self.apk))
        self.device = u2.connect(self.serial)
        self.device.debug = False
        self.device.implicitly_wait(10)
        self.device.screen_on()
        self.adb('shell', 'wm', 'dismiss-keyguard')
        self.adb('shell', 'settings', 'put', 'secure', 'show_ime_with_hard_keyboard', '1')
        self.device.screen_on()
        self.device.app_start(APP)
        self.wait(lambda: self.device(text='Me connecter').exists, 'initial team sign-in')
        self.shot('certified-apk-team-signin', None, '110002 team sign-in')
        for key, label in ROLES:
            self.login(key, label)
            self.menu(key, label)
            self.settings(key, label)
            self.stage = key.lower() + '-logout'
            self.top()
            self.tap('Déconnexion')
            self.wait(lambda: self.device(text='Me connecter').exists, 'signed out')
            # Closing/reopening is non-destructive; no pm clear/uninstall or business cleanup.
            self.device.app_stop(APP)
            self.device.app_start(APP)
        self.login('EMPLOYEE', 'Employé chantier', home_name='employee-before-local-form')
        self.employee_form_and_back()
        self.top()
        self.tap('Déconnexion')
        self.wait(lambda: self.device(text='Me connecter').exists, 'final sign out')
        import shutil
        shutil.copyfile(Path(__file__).with_name('phase11-samsung-checklist.txt'), self.output / 'SAMSUNG-CHECKLIST.txt')
        self.save_manifest('complete')
        print('Native PNG count: '+str(len(self.manifest['screens'])))
        print('PASS native screenshot generation: five role menus, forms and Android back; visual inspection still required.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['verify', 'capture'])
    parser.add_argument('--artifact-root', type=Path, required=True)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--serial', default=os.environ.get('ANDROID_SERIAL', 'emulator-5554'))
    parser.add_argument('--generator-sha', default=os.environ.get('CAPTURE_GENERATOR_SHA', ''))
    args = parser.parse_args()
    if args.mode == 'verify':
        certified_apk(args.artifact_root)
        print('PASS certified original APK source, version, SHA-256 and TEST configuration')
        return 0
    if not args.output or not re.fullmatch('[0-9a-f]{40}', args.generator_sha):
        parser.error('Output and exact generator SHA required')
    capture = None
    try:
        capture = Capture(args.artifact_root, args.output, args.serial, args.generator_sha)
        capture.run()
        return 0
    except Exception as error:
        # Do not print exception payloads: third-party RPC errors may include credentials.
        if capture:
            capture.manifest['failure_type'] = type(error).__name__
            if capture.device:
                try:
                    import xml.etree.ElementTree as ET
                    tree = ET.fromstring(capture.device.dump_hierarchy())
                    labels = SAFE_NAV | {label for _, label in ROLES} | {'Nouvelle demande', 'Apparence et réglages', 'Ouvrir le menu MIR', 'Fermer le menu MIR', 'Motif ou commentaire'}
                    texts = [value for node in tree.iter('node') for value in (node.get('text', ''),node.get('content-desc',''))]
                    capture.manifest['safe_ui_probe'] = {'known_labels': sorted(label for label in labels if any(label in text for text in texts)),
                        'edit_field_count': sum(node.get('class') == 'android.widget.EditText' for node in tree.iter('node')),
                        'foreground_package': capture.device.app_current().get('package')}
                except Exception:
                    capture.manifest['safe_ui_probe'] = {'unavailable': True}
            capture.save_manifest('failed')
            print('Safe UI state: '+json.dumps(capture.manifest.get('safe_ui_probe',{})),file=sys.stderr)
        if type(error) is CaptureError:
            print('Diagnostic: '+str(error), file=sys.stderr)
        print('FAIL native capture generation at ' + (capture.stage if capture else 'APK verification')
              + ' (' + type(error).__name__ + '); no credential or image payload logged.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
