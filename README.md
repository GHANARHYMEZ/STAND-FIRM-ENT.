# STAND FIRM ENT. — Android, Windows and web app

One interface, three outputs. `src/index.html` is your app, untouched. `npm run build:web` turns it into `www/`,
and that same folder is packaged as:

| Target | Tool | Output |
|---|---|---|
| Installable web app (PWA) | `www/` + manifest + service worker | host the folder, then "Install" in the browser |
| Android | Capacitor | `dist/StandFirmENT-android.apk` |
| Windows | Electron + NSIS | `dist/StandFirmENT-Setup-1.0.0.exe` |

Fonts (Bricolage Grotesque, Figtree) are bundled into the build, so the look is the same offline.

## Easiest: let GitHub build everything
1. Create a GitHub repo and push this folder to the `main` branch.
2. Open the **Actions** tab. Each push builds all three. Download the files from the run's **Artifacts**.
3. Web app link: in the repo go to Settings → Pages → Source: **GitHub Actions**. After the next push the app is live at
   `https://<you>.github.io/<repo>/`. Open it in Chrome/Edge/Safari and choose **Install** / **Add to Home Screen**.
4. To publish a downloadable release: `git tag v1.0.0 && git push --tags`.

## Build on your own computer
Needs Node 20+. For Android also JDK 21 and the Android SDK (Android Studio installs both).
```
npm install
npm run serve:web        # web app at http://localhost:8080
npm run electron:dev     # try the desktop app
npm run build:win        # run this on Windows -> dist/*.exe
npm run android:setup    # once
npm run android:build    # -> dist/StandFirmENT-android.apk
```

## Android signing (important before real use)
Without a key, the APK is debug-signed: it installs, but every build has a different signature, so a new APK
**cannot update** an installed one (you would have to uninstall first, which erases saved data). Make one permanent key:
```
keytool -genkeypair -v -keystore standfirm.keystore -alias standfirm -keyalg RSA -keysize 2048 -validity 10000
```
Keep that file and its passwords safe forever. Then add GitHub secrets `ANDROID_KEYSTORE_BASE64`
(`base64 -w0 standfirm.keystore`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
The workflow then builds a release-signed APK automatically. Locally, set the same four variables
(plus `ANDROID_KEYSTORE_PATH`) before `npm run android:build`.

## Things to know
- **Data is stored on each device separately** (the app uses browser storage). The phone, the PC and the web version
  do not share sales or stock. Moving a shop between devices needs an export/import or a server added to the app.
- **Web app data lives in that browser.** Clearing browser data erases it; installing the web app does not back it up.
- Windows installers are not code-signed, so Windows SmartScreen may show "unknown publisher" (More info → Run anyway).
- `window.print()` (receipts) works on Windows and web; Android's built-in WebView does not open a print dialog for it.
- To change the icon edit `scripts/make-icons.py` and run `npm run icons`.
