# EAS Free Builds, Alternate Accounts, and Build Profiles

## Important answer

Creating another Expo account **just to bypass a free-build quota is not a safe long-term solution**. Expo may treat it as quota circumvention, free limits can change, and another account does not automatically receive the existing EAS project or Android signing credentials.

Prefer waiting for the quota reset and avoid rebuilding when a JavaScript-only change can be tested with Metro. If the app genuinely needs a different owner, transfer the existing EAS project instead of creating a duplicate.

## The identity that must never accidentally change

These are separate identities:

| Identity | Current value | Why it matters |
|---|---|---|
| Android package | `com.tarfw.app` | Permanent Play/Firebase app identity |
| EAS project ID | `efb1d63a-cd61-4d36-8906-a2fefc57b4f8` | Links source code to the EAS project |
| EAS Android keystore/upload key | SHA-1 `A9:9C:8A:83:DE:9A:B4:CB:06:49:0F:7A:DE:62:C9:6B:FF:DA:95:99` | Signs direct APKs and authorizes AAB uploads to Play |
| Play App Signing keys | Three Play-managed SHA-1s | Sign APKs delivered by Google Play |

Changing Expo accounts must not accidentally change the package name or EAS upload key.

## Recommended: transfer the existing EAS project

Use this only for a legitimate ownership change. Expo requires you to be an Owner/Admin on both accounts, and project transfers are limited.

1. Before transferring, run `eas credentials -p android` and securely back up the existing keystore, alias, and passwords. Never commit them to Git.
2. In the Expo dashboard, open **Project settings → General → Transfer project**.
3. Transfer the existing project to the destination account.
4. Change `expo.owner` in `app.json` from `tarteam01` to the destination account name.
5. Keep `extra.eas.projectId` unchanged: `efb1d63a-cd61-4d36-8906-a2fefc57b4f8`. Expo documents that the project UUID does not change during a transfer.
6. Log into the destination account and run:

   ```bash
   eas whoami
   eas project:info
   eas credentials -p android
   ```

7. Confirm the Android credential still has SHA-1 `A9:9C:...:95:99` before building.
8. Recreate or verify EAS environment variables, secrets, webhooks, submit credentials, and member access if they are not present after transfer.

If the same keystore and package remain in use, Firebase, Google OAuth, and Play Console need no SHA changes.

## Higher risk: create a completely new EAS project

A new account plus `eas init` creates a new EAS project ID. Do this only when transfer is unavailable.

### Required steps

1. Back up the current Android keystore and passwords from the old EAS project.
2. Log into the new account.
3. Create/link the new EAS project and update `expo.owner` and `extra.eas.projectId`.
4. Import the **existing keystore** into the new project using `credentials.json`/local credentials and `eas credentials`.
5. Copy all required EAS environment variables and secrets.
6. Confirm the resulting credential SHA-1 remains `A9:9C:...:95:99`.
7. Run `eas project:info` and `eas credentials -p android` before the first build.

### If EAS generates a new keystore by mistake

- Direct development/preview APKs will have a new SHA-1. Google Sign-In will require that SHA-1 in Firebase plus a matching Google Cloud Android OAuth client.
- Google Play will reject an AAB signed with the new upload key because it does not match the registered upload certificate.
- Fixing that requires a Play Console **upload-key reset**. Do not request a reset unless the old keystore is truly unavailable.
- Play App Signing keys do not change merely because the Expo account changes.

The safest rule is: **reuse the existing EAS keystore; do not generate a new one.**

## Current `eas.json` profiles

| Profile | Artifact | Needs Metro? | Purpose | Command |
|---|---|---:|---|---|
| `development` | APK | Yes | Developer tools, live JS/Metro debugging; never upload to Play | `eas build -p android --profile development` |
| `preview` | APK | No | Standalone production-like testing installed directly on a phone | `eas build -p android --profile preview` |
| `internal` | AAB | No | Google Play Internal Testing; despite its name, it is a store-distribution bundle | `eas build -p android --profile internal` |
| `production` | AAB | No | Google Play production/closed/open release | `eas build -p android --profile production` |

### How to choose

- Actively coding and need fast refresh: build `development` once, then use `npx expo start --dev-client` for JavaScript changes.
- Need an installable standalone APK: use `preview`.
- Need to verify Google Play signing or Internal Testing: use `internal`.
- Need a release candidate for public distribution: use `production`.

APK files install directly. AAB files must be uploaded to Google Play and cannot be installed directly.

## Saving limited free builds

- Reuse a development client until native dependencies, Expo plugins, permissions, icons, or other native configuration changes.
- JavaScript/TypeScript/UI changes normally need only Metro, not another native development build.
- Use `preview` only when standalone behavior must be tested.
- Use `internal` to verify the exact Play-distributed signing path.
- Avoid building both `internal` and `production` from the same unchanged commit unless both tracks are genuinely needed.
- Run `npx expo-doctor`, `npx expo install --check`, TypeScript, and lint before consuming a cloud build.

## Migration checklist

- [ ] Legitimate project transfer or new owner—not quota circumvention
- [ ] Package remains `com.tarfw.app`
- [ ] Existing EAS keystore securely backed up
- [ ] Upload SHA-1 remains `A9:9C:...:95:99`
- [ ] Existing EAS project ID retained when transferring
- [ ] `expo.owner` matches the owning account
- [ ] Environment variables and secrets verified
- [ ] `eas project:info` points to the intended project
- [ ] `eas credentials -p android` shows the intended keystore
- [ ] No Play upload-key reset unless absolutely necessary
- [ ] No Firebase/Google OAuth changes when the signing SHA-1 is unchanged

## References

- [Expo account and project transfers](https://docs.expo.dev/accounts/account-types/)
- [Using existing EAS credentials](https://docs.expo.dev/app-signing/existing-credentials/)
- [EAS build profiles](https://docs.expo.dev/build/eas-json/)
- [Android APK builds](https://docs.expo.dev/build-reference/apk/)
