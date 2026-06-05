# TWA / Android APK Setup

The app is now a PWA. To get an APK you need to:
1. Deploy to a public HTTPS URL (TWAs wrap the live site)
2. Run bubblewrap to generate + build the Android project
3. Add `assetlinks.json` to your deployed site (proves you own the URL → removes the URL bar from the APK)

Everything below assumes you're in `~/Downloads/calc-iteration2/`.

---

## 1. Deploy (pick one)

### Option A — Vercel (simplest)

```bash
npm i -g vercel
vercel login
vercel --prod
# Note the deployed URL, e.g. https://calc-abc.vercel.app
```

Add all `VITE_FIREBASE_*` env vars from your `.env.local` in the Vercel dashboard → Settings → Environment Variables, then redeploy.

### Option B — Firebase Hosting (since you already have a Firebase project)

```bash
npm i -g firebase-tools
firebase login
firebase init hosting
# - Use existing project (pick yours)
# - Public directory: dist
# - SPA: Yes
# - Auto-build with GitHub: No
npm run build
firebase deploy --only hosting
# URL will be: https://<project-id>.web.app
```

---

## 2. Generate Android project with Bubblewrap

After deployment, with your deployed URL (e.g. `https://calc-abc.vercel.app`):

```bash
mkdir -p android && cd android
bubblewrap init --manifest=https://YOUR-URL/manifest.webmanifest
```

Bubblewrap will prompt for:
- **Domain**: auto-filled from manifest
- **App name / Short name**: `CALC`
- **Package name**: `com.pratik.calc` (must be reverse-DNS, can't change later on Play Store)
- **Display mode**: `standalone`
- **Orientation**: `portrait`
- **Theme color** / **Background color**: already in manifest
- **Status bar color**: `#EDEBF2`
- **Splash image**: auto from manifest
- **Signing key**: let it generate one — **back up `android.keystore` + the password!** Losing them = can never update the app.

Then build:

```bash
bubblewrap build
```

Output:
- `app-release-signed.apk` → sideload onto your phone (enable "Install unknown apps")
- `app-release-bundle.aab` → upload to Play Store

Install on a connected phone:
```bash
adb install app-release-signed.apk
```

---

## 3. Remove the URL bar (Digital Asset Links)

Without this, your TWA shows a Chrome address bar at the top — looks like a browser, not an app.

Bubblewrap prints a `assetlinks.json` snippet after `build` (or run `bubblewrap fingerprint`). It looks like:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.pratik.calc",
    "sha256_cert_fingerprints": ["AA:BB:CC:..."]
  }
}]
```

Save it as `public/.well-known/assetlinks.json` in this project, redeploy, and verify it's reachable:
```bash
curl https://YOUR-URL/.well-known/assetlinks.json
```

Reinstall the APK. URL bar disappears.

---

## 4. Updating the app later

When you change web code:
```bash
npm run build
vercel --prod          # or firebase deploy
```
The TWA picks up changes on next launch — **no APK rebuild needed**.

When you change `manifest.webmanifest`, app name, icons, or package metadata:
```bash
cd android
bubblewrap update
bubblewrap build
adb install -r app-release-signed.apk
```

---

## Local state

- ✅ `vite-plugin-pwa` installed and configured (`vite.config.ts`)
- ✅ Icons generated at `public/pwa-{192,512}x{192,512}.png`, `maskable-icon-512x512.png`, `apple-touch-icon.png`, `favicon.ico`
- ✅ Build produces `dist/manifest.webmanifest` + `dist/sw.js`
- ✅ Bubblewrap CLI installed globally (`bubblewrap doctor` passes)
- ✅ JDK 17 (`~/.jdks/jbr-17.0.14`) and Android SDK (`/mnt/windows/data/Android/Sdk`) configured for bubblewrap
- ⏳ **YOU**: deploy → run `bubblewrap init` → `bubblewrap build`
