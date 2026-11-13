const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'dist/apercu-refonte-publique.html');
const output = path.join(root, 'docs/verification/refonte-site-public/apercu-refonte-publique-autonome.html');
const image = path.join(root, 'dist/assets/products/mir-provided-20261111/beck-panelfast-ags100-coil.webp');
const imageRef = 'assets/products/mir-provided-20261111/beck-panelfast-ags100-coil.webp';
const dataUri = `data:image/webp;base64,${fs.readFileSync(image).toString('base64')}`;

const html = fs.readFileSync(source, 'utf8').replaceAll(imageRef, dataUri);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(path.relative(root, output));
