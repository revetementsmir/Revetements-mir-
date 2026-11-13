#!/usr/bin/env python3
"""Run the unchanged Pages verification block over a tracked, local artifact.

This does not deploy anything or certify GitHub Pages. No Supabase connection.
"""
import argparse
import hashlib
import http.server
import io
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile
import textwrap
import threading

ROOT = Path(__file__).resolve().parents[2]


def block(name):
    workflow = (ROOT / '.github/workflows/pages.yml').read_text()
    start = workflow.index('      - name: ' + name + '\n')
    following = workflow[start + 1:]
    end = re.search(r'^      - ', following, re.M)
    step = following[:end.start()] if end else following
    return textwrap.dedent(step.split('        run: |\n', 1)[1])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--tamper-model-response', action='store_true',
                        help='Negative check: byte comparison must reject changed HTTP bytes.')
    args = parser.parse_args()
    subprocess.run(['git', 'diff', '--exit-code', 'HEAD', '--', 'dist'], cwd=ROOT, check=True)
    work = Path(tempfile.mkdtemp(prefix='mir-pages-local-'))
    output = (args.output or work / 'proof').resolve()
    output.mkdir(parents=True, exist_ok=True)
    archive = subprocess.check_output(['git', 'archive', 'HEAD', 'dist'], cwd=ROOT)
    with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:
        bundle.extractall(work, filter='data')
    subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', block('Préparer uniquement le site MIR principal')],
                   cwd=work, check=True)
    (work / 'tests').symlink_to(ROOT / 'tests', target_is_directory=True)
    artifact = work / '_site_mir'
    requests = []

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(artifact), **kw)

        def log_message(self, *_):
            pass

        def do_GET(self):
            requests.append(self.path)
            if args.tamper_model_response and self.path.split('?')[0] == '/production-model.js':
                data = (artifact / 'production-model.js').read_bytes() + b'\n/* altered HTTP bytes */\n'
                self.send_response(200)
                self.end_headers()
                self.wfile.write(data)
            else:
                super().do_GET()

    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    script = block('Verify published MIR pages')
    (output / 'verify.sh').write_text(script)
    env = dict(os.environ, PAGE_URL=f'http://127.0.0.1:{server.server_port}', GITHUB_SHA=sha)
    try:
        with (output / 'verify.log').open('w') as log:
            result = subprocess.run(['bash', '-ex', '-o', 'pipefail', '-c', script],
                                    cwd=work, env=env, stdout=log, stderr=subprocess.STDOUT)
    finally:
        server.shutdown()
        server.server_close()
    manifest = {str(p.relative_to(artifact)): hashlib.sha256(p.read_bytes()).hexdigest()
                for p in sorted(artifact.rglob('*')) if p.is_file()}
    (output / 'artifact-sha256.json').write_text(json.dumps(manifest, indent=2))
    annotations = work / 'artifacts/pages-profile-annotations'
    if annotations.exists():
        shutil.copytree(annotations, output / 'profile-annotations', dirs_exist_ok=True)
    data = dict(local_only=True, github_pages_certified=False, source_sha=sha,
                dist_tree=subprocess.check_output(['git', 'rev-parse', 'HEAD:dist'], cwd=ROOT, text=True).strip(),
                exit_code=result.returncode, artifact_files=len(manifest), http_gets=len(requests),
                tampered=args.tamper_model_response, artifact=str(artifact), proof=str(output))
    (output / 'result.json').write_text(json.dumps(data, indent=2))
    print(json.dumps(data))
    if result.returncode:
        commands = [line for line in (output / 'verify.log').read_text().splitlines() if line.startswith('+ ')]
        print('\n'.join(commands[-5:]))
    return result.returncode


if __name__ == '__main__':
    raise SystemExit(main())
