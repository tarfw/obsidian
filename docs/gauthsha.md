# Google Sign-In for Expo/EAS and Google Play

This handbook explains how Android signing certificates, Expo EAS, Google Play, Firebase, and Google OAuth fit together. It also records the working configuration for `com.tarfw.app` and the fix for Google Sign-In error `DEVELOPER_ERROR (10)`.

## The short version

Google Sign-In identifies an Android app using this pair:

```text
package name + signing-certificate SHA-1
```

Every certificate that can sign an installed copy of the app needs its own **Android OAuth client** in Google Cloud. Register the same certificate fingerprints in the Firebase Android app.

For this project, the correct inventory is:

- One EAS upload/direct-APK SHA-1.
- Three Google Play SHA-1s because the Play app uses quantum-ready hybrid signing.
- One Web OAuth client ID, passed to `GoogleSignin.configure()` as `webClientId`.

## Why EAS APK worked but Play AAB failed

```text
Direct EAS APK
EAS signs APK ───────────────► installed app keeps EAS certificate

Google Play AAB
EAS signs AAB ─► Play verifies upload ─► Play creates APKs ─► Play re-signs APKs
```

The EAS certificate is the identity of a directly installed EAS APK. For an AAB distributed through Play, the EAS key is only the **upload key**. Play signs the APK delivered to the phone with a Play App Signing key.

The failed Play build was signed by a Play certificate that had no matching Android OAuth client. Google therefore returned:

```text
DEVELOPER_ERROR (10)
```

No React Native, Expo, EAS profile, package-name, or Web client defect caused the error.

## Why Google Play now has three signing keys

New Play apps can be enrolled automatically in quantum-ready hybrid signing for Android 17+:

1. A legacy classical key for Android 16 and earlier.
2. A new classical key used by the hybrid signature on Android 17+.
3. A post-quantum key used with the new classical key on Android 17+.

Google instructs quantum-ready apps to register all three Play fingerprints with API providers. Older Play apps may still have only one Play signing key unless their key was upgraded.

## Working configuration for `com.tarfw.app`

Project identifiers:

| Item | Value |
|---|---|
| Android package | `com.tarfw.app` |
| Firebase/Google Cloud project | `tarapp-504815` |
| Project number | `226183831843` |
| EAS project ID | `efb1d63a-cd61-4d36-8906-a2fefc57b4f8` |
| Web OAuth client | `226183831843-5sjvl1hsv4d04aucnqsqn19u83o4f5ku.apps.googleusercontent.com` |

### Required SHA-1 fingerprints

| Certificate | SHA-1 | Google Cloud Android OAuth client |
|---|---|---|
| EAS upload/direct APK | `A9:9C:8A:83:DE:9A:B4:CB:06:49:0F:7A:DE:62:C9:6B:FF:DA:95:99` | `226183831843-oo3ga188i4qna8r29a5q2446a5fdt39k.apps.googleusercontent.com` |
| Play current classical | `3F:5A:31:41:A0:4E:E4:12:1F:A1:6D:94:EA:36:92:4D:B8:0C:32:D5` | `226183831843-fni58uld63t1ghdvvafssc88l6v632u5.apps.googleusercontent.com` |
| Play legacy/older-device | `C3:06:D4:ED:DF:8B:15:8D:A6:09:7D:D5:C7:48:84:06:6E:85:5F:28` | `226183831843-dhbt7orgjc1prci3d21k2q2c43ibq1pq.apps.googleusercontent.com` |
| Play post-quantum | `EE:65:07:1E:9B:C5:80:6E:07:6A:FB:47:B8:E9:FC:A8:4F:69:7C:28` | `226183831843-l1d7utbpvfb5pa1lbpo0ullrdel5jp05.apps.googleusercontent.com` |

### Play SHA-256 fingerprints

SHA-1 is the important value for Android Google Sign-In. Keep the Play SHA-256 values in Firebase as well for completeness and services such as verified app links.

| Play certificate | SHA-256 |
|---|---|
| Legacy/older-device | `DA:8D:84:09:4A:5B:0D:34:B4:81:F4:B8:BD:BC:75:D0:1C:E3:99:3B:05:3B:2B:0E:FC:1D:62:4E:17:EB:C9:82` |
| Current classical | `76:25:37:61:89:37:18:01:41:8B:90:95:BB:09:97:F2:25:A1:18:73:0B:75:9E:9B:52:D6:C3:01:56:F1:B0:C8` |
| Post-quantum | `82:7F:DF:DD:99:13:65:24:A5:9A:93:DA:18:6D:37:1A:46:FC:B1:E2:15:17:97:7E:E8:32:51:DE:74:60:36:58` |

## End-to-end setup procedure

### 1. Confirm the app identity

Check that these values all use the same package:

- Expo config: `expo.android.package`
- Firebase Android app package
- Google Cloud Android OAuth client package
- Google Play app package

For this project they must all be `com.tarfw.app`. Do not use one of the similarly named older Play apps.

### 2. Collect signing fingerprints

In Play Console:

1. Open the exact app.
2. Go to **Protected with Play → Play Store protection → Manage Play app signing**.
3. Record every SHA-1 under **App signing key** and **Previous app signing keys**.
4. Record the **Upload key certificate** SHA-1.

For EAS, the Play upload certificate normally matches the Android production keystore used by EAS. Directly installed EAS APKs need this SHA-1 registered too.

### 3. Register fingerprints in Firebase

1. Open **Firebase Console → Project settings → General**.
2. Select the Android app with the exact package name.
3. Under **SHA certificate fingerprints**, add every relevant SHA-1.
4. Add the Play SHA-256 fingerprints.
5. Never delete an older fingerprint while builds signed by it may still be installed.

### 4. Create matching Android OAuth clients

Open **Google Cloud Console → Google Auth Platform → Clients** in the same project.

For every SHA-1, confirm there is exactly one Android OAuth client with:

```text
Application type: Android
Package name: com.tarfw.app
SHA-1: the exact certificate fingerprint
```

If a client is missing, create it. A useful naming pattern is:

```text
<app> android eas upload
<app> android play legacy
<app> android play classical
<app> android play pqc
```

Android OAuth client IDs are registered identities; they are not passed to `GoogleSignin.configure()` in this app.

### 5. Keep the Web OAuth client in the app

The React Native configuration must use the **Web application** client ID:

```ts
GoogleSignin.configure({
  webClientId: "226183831843-5sjvl1hsv4d04aucnqsqn19u83o4f5ku.apps.googleusercontent.com",
  offlineAccess: false,
  scopes: ["profile", "email"],
});
```

Do not replace `webClientId` with an Android client ID. The Android clients validate package-and-certificate identities in Google Cloud; the Web client is used to request the ID token.

### 6. Refresh `google-services.json`

Download a fresh file from the Firebase Android app after changing OAuth clients or fingerprints, then replace:

```text
tarapp/google-services.json
```

Verify it contains:

- The correct project number and project ID.
- Package `com.tarfw.app`.
- Four `client_type: 1` Android entries with the required certificate hashes.
- The unchanged `client_type: 3` Web client.

Certificate hashes inside JSON are lowercase and contain no colons. Example:

```text
C3:06:D4:...:5F:28
becomes
c306d4...5f28
```

### 7. Validate before building

Run from `tarapp`:

```bash
npx expo-doctor --verbose
npx expo install --check
npx tsc --noEmit
npx eslint src/lib/auth.ts
```

Expected results for the completed fix:

- Expo Doctor: 21/21 checks pass.
- Expo dependencies: up to date.
- TypeScript: passes.
- Authentication-file lint: passes.
- `@react-native-google-signin/google-signin`: version `16.1.4`.

No additional package, Firebase Auth SDK, or switch to `expo-auth-session` is required.

### 8. Test in the correct order

1. Wait for Google OAuth propagation. The Cloud form warns that changes may take five minutes to several hours.
2. Force-stop and reopen the existing Play-installed build.
3. Retry Google Sign-In before rebuilding; certificate registration is a server-side fix.
4. If necessary, uninstall and reinstall from the Play Internal Testing link.
5. Only then create a new EAS AAB and upload it manually.
6. Test on Android 16 or earlier and Android 17+ when both are available.

## Troubleshooting checklist

For `DEVELOPER_ERROR (10)`, check in this order:

1. Is the installed app package exactly the package registered in the Android OAuth client?
2. Was the app installed directly as an EAS APK or through Google Play?
3. Which certificate actually signed the installed APK?
4. Does Google Cloud contain an Android OAuth client for that exact package + SHA-1 pair?
5. Does Firebase contain the same SHA-1?
6. For quantum-ready Play signing, are the legacy, new classical, and PQC SHA-1s all registered?
7. Is the app still using the Web OAuth client as `webClientId`?
8. Was `google-services.json` refreshed after the change?
9. Has enough propagation time passed?

Package updates rarely fix error 10. Do not change authentication libraries until the package and signing-certificate mapping has been proven correct.

## When this must be repeated

Repeat the certificate audit when:

- The Android package name changes.
- The EAS upload key is reset or replaced.
- Play rotates or upgrades an app-signing key.
- Quantum-ready signing is enabled later for an older app.
- A new Firebase/Google Cloud project is introduced.
- A build works as a direct APK but fails after Play distribution.

Normal application releases do not require creating new OAuth clients when the signing keys remain unchanged.

## Reusable instruction prompt

Use this prompt for future Expo/EAS Android Google Sign-In failures:

```text
Diagnose and fix Google Sign-In DEVELOPER_ERROR (10) for this Expo/EAS Android app.

Requirements:
- Do not start an EAS cloud build; I will build manually.
- Inspect the repository first: app config, package name, eas.json, google-services.json, Google Sign-In setup, installed package versions, and Expo compatibility.
- In the signed-in browser, inspect the exact Google Play app, Firebase Android app, and Google Cloud project.
- Distinguish the EAS upload/direct-APK certificate from every Google Play App Signing certificate.
- Check whether Play uses quantum-ready hybrid signing. If it does, collect the legacy classical, new classical, and PQC SHA-1 fingerprints, including previous signing keys.
- Build a table mapping each distribution path, SHA-1, package name, and Android OAuth client ID.
- Add only missing Firebase fingerprints and Google Cloud Android OAuth clients after confirming the exact package and certificate pairs.
- Keep the Web OAuth client as webClientId; do not replace it with an Android client ID.
- Refresh google-services.json and verify all Android OAuth entries and the Web client.
- Do not add or upgrade packages unless a compatibility check proves it is necessary.
- Run Expo Doctor, expo install --check, TypeScript, and authentication-file lint.
- Report propagation time, what can be tested without rebuilding, and any unrelated pre-existing failures separately.
- Never delete or rotate signing keys, reset credentials, or run an EAS build without explicit approval.
```

## References

- [Google Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Firebase: Authenticate with Google on Android](https://firebase.google.com/docs/auth/android/google-signin)
- [React Native Google Sign-In](https://react-native-google-signin.github.io/docs/setting-up/get-config-file)
