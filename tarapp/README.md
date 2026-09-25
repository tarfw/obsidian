# TAR App

Expo/React Native client for Space, unified Inbox, Ask TAR, Flow Books, commerce
interfaces, members and Site Studio. Business state and mutations stay in TAR
Harness; the app holds only identity/session and transient presentation state.

## Develop

```sh
npm install
npm start
```

## Release checks

```sh
npx tsc --noEmit
npm run lint
npm run release:check
```

EAS profiles in `eas.json` point to the production Harness URL. Google identity
configuration must match the Android package and EAS project in `app.json`.

```sh
npx eas build --platform android --profile production
```

See [tarv12.md](../tarv12.md) for the system contract.
