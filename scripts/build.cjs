const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const plink = path.join('vendor', 'plink.exe');
if (!fs.existsSync(plink) || crypto.createHash('sha256').update(fs.readFileSync(plink)).digest('hex') !== '969f36879d5716aa1a9811f43a6a6510e8f08372dbeb9695b810b9c776f39c75') throw Error('Falta Plink 0.85 verificado. Ejecuta npm run vendor antes de compilar.');
require('esbuild').buildSync({entryPoints: ['src/renderer.js'], bundle: true, outfile: 'ui/app.js', platform: 'browser', target: 'chrome140'});
fs.copyFileSync(require.resolve('@xterm/xterm/css/xterm.css'), path.join('ui', 'xterm.css'));
