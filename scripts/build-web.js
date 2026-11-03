// Builds ./www from ./src/index.html. This one folder feeds all three targets
// (web app, Android via Capacitor, Windows via Electron), so the interface is identical everywhere.
// The app's own HTML/CSS/JS is not modified; only head tags, bundled fonts and the web-only service worker are added.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'www');
const rel = (...p) => path.join(ROOT, ...p);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });

let html = fs.readFileSync(rel('src', 'index.html'), 'utf8');

// ---- 1. Bundle the Google Fonts locally so the app looks the same offline ----
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const faces = [];
function addFace(family, weight, pkgDir, file, range) {
  const src = rel('node_modules', pkgDir, 'files', file);
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, path.join(OUT, 'fonts', file));
  faces.push(`@font-face{font-family:'${family}';font-style:normal;font-display:swap;font-weight:${weight};src:url(fonts/${file}) format('woff2');unicode-range:${range}}`);
  return true;
}
let fontsOk = true;
for (const [sub, range] of [['latin', LATIN], ['latin-ext', LATIN_EXT]]) {
  fontsOk = addFace('Bricolage Grotesque', '200 800', '@fontsource-variable/bricolage-grotesque', `bricolage-grotesque-${sub}-wght-normal.woff2`, range) && fontsOk;
  for (const w of [400, 500, 700]) fontsOk = addFace('Figtree', String(w), '@fontsource/figtree', `figtree-${sub}-${w}-normal.woff2`, range) && fontsOk;
}
const gfLink = /<link[^>]+fonts\.googleapis\.com[^>]*>/i;
if (faces.length && fontsOk) {
  fs.writeFileSync(path.join(OUT, 'fonts.css'), faces.join('\n'));
  html = html.replace(gfLink, '<link rel="stylesheet" href="fonts.css">');
} else {
  console.warn('WARNING: font packages not found (run `npm install` first). Keeping the Google Fonts link; fonts will not load offline.');
  fs.rmSync(path.join(OUT, 'fonts'), { recursive: true, force: true });
}

// ---- 2. PWA head tags (harmless in Android/Electron) ----
const head = [
  '<meta name="theme-color" content="#0f5c3a">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="STAND FIRM">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="icon" href="icons/icon-192.png">',
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">'
].join('\n');
html = html.replace('</title>', '</title>\n' + head);

// ---- 3. Service worker registration: browsers only (not Android app, not Electron) ----
const reg = `<script>if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!window.Capacitor&&!/Electron/.test(navigator.userAgent)){addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}</script>`;
html = html.replace('</body>', reg + '\n</body>');
fs.writeFileSync(path.join(OUT, 'index.html'), html);

// ---- 4. Static PWA files ----
fs.copyFileSync(rel('pwa', 'manifest.webmanifest'), path.join(OUT, 'manifest.webmanifest'));
for (const f of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) fs.copyFileSync(rel('pwa', f), path.join(OUT, 'icons', f));

// ---- 5. Service worker with a precache list and a content-based version ----
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const assets = walk(OUT).map(f => path.relative(OUT, f).split(path.sep).join('/')).filter(f => f !== 'sw.js');
assets.push('./');
const hash = crypto.createHash('sha1');
for (const f of assets.filter(a => a !== './').sort()) hash.update(f).update(fs.readFileSync(path.join(OUT, f)));
fs.writeFileSync(
  path.join(OUT, 'sw.js'),
  fs.readFileSync(rel('pwa', 'sw.js'), 'utf8').replace('__BUILD__', () => hash.digest('hex').slice(0, 10)).replace('__ASSETS__', () => JSON.stringify(assets))
);
console.log(`www/ built: ${assets.length} files${fontsOk ? ', fonts bundled' : ', fonts NOT bundled'}`);
