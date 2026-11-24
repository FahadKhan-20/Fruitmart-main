# MD Fresh — Android app

Customer app built from the "MD Fresh App v2" design: Vite + React, packaged for Android with Capacitor 8.

**Status: standalone demo.** Products, cart, saved items and orders live on the device. Login accepts any
4-digit code (no SMS), and order tracking is simulated. It is not yet connected to the Next.js backend.

## Develop

```bash
cd mobile
npm install
npm run dev            # browser preview at http://localhost:5173 (use a phone-sized window)
```

## Build the APK

Needs JDK 21 and the Android SDK (platform 36, build-tools 36).

```bash
export JAVA_HOME=~/.local/jdk-21 ANDROID_HOME=~/Android/Sdk
npm run android:apk    # -> android/app/build/outputs/apk/debug/app-debug.apk
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Regenerate icons and the launch screen from `assets/` with `npx capacitor-assets generate --android`.
