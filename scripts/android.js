// Usage: node scripts/android.js setup   (once: creates ./android, icons, signing)
//        node scripts/android.js build   (builds the APK into ./dist)
// Signing: if ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS and ANDROID_KEY_PASSWORD
// are set, a signed release APK is built. Otherwise a debug-signed APK is built (installable, but see README).
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ANDROID = path.join(ROOT, 'android');
const isWin = process.platform === 'win32';
const run = (cmd, args, cwd = ROOT) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
  if (r.status !== 0) { console.error(`\nFailed: ${cmd} ${args.join(' ')}`); process.exit(r.status || 1); }
};
const npx = (...a) => run(isWin ? 'npx.cmd' : 'npx', a);
const signed = !!(process.env.ANDROID_KEYSTORE_PATH && process.env.ANDROID_KEYSTORE_PASSWORD && process.env.ANDROID_KEY_ALIAS && process.env.ANDROID_KEY_PASSWORD);

function patchSigning() {
  const f = path.join(ANDROID, 'app', 'build.gradle');
  let g = fs.readFileSync(f, 'utf8');
  if (g.includes('SFE_SIGNING')) return;
  const block = `
    // SFE_SIGNING: release signing from environment variables
    signingConfigs {
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }
    buildTypes {
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) { signingConfig signingConfigs.release }`;
  const re = /buildTypes\s*\{\s*release\s*\{/;
  if (!re.test(g)) throw new Error('Could not find buildTypes/release in android/app/build.gradle to add signing. Capacitor template changed; see README.');
  fs.writeFileSync(f, g.replace(re, () => block.trimStart()));
}

function setup() {
  if (!fs.existsSync(ANDROID)) npx('cap', 'add', 'android');
  npx('capacitor-assets', 'generate', '--android', '--assetPath', 'assets');
  patchSigning();
  console.log('\nAndroid project ready in ./android');
}

function build() {
  if (!fs.existsSync(ANDROID)) setup();
  run(isWin ? 'npm.cmd' : 'npm', ['run', 'build:web']);
  npx('cap', 'sync', 'android');
  const task = signed ? 'assembleRelease' : 'assembleDebug';
  run(isWin ? 'gradlew.bat' : './gradlew', [task], ANDROID);
  const out = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', signed ? 'release' : 'debug');
  const apk = fs.readdirSync(out).find(f => f.endsWith('.apk'));
  if (!apk) throw new Error('Gradle finished but no .apk was found in ' + out);
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  const dest = path.join(ROOT, 'dist', 'StandFirmENT-android.apk');
  fs.copyFileSync(path.join(out, apk), dest);
  console.log(`\nAPK ready: ${dest}  (${signed ? 'release-signed' : 'debug-signed'})`);
}

const cmd = process.argv[2];
if (cmd === 'setup') setup(); else if (cmd === 'build') build(); else { console.error('Usage: node scripts/android.js setup|build'); process.exit(1); }
