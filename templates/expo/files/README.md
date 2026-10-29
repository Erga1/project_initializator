# {{projectName}}

A React Native app built with Expo and Expo Router, written in {{languageName}}. It runs on iOS, Android, and the web, and ships with linting, formatting, Git hooks, tests, CI, and Dependabot.

## Development

```sh
cp .env.example .env
{{pm}} run start
```

Then press `i` for the iOS simulator, `a` for an Android emulator, or scan the QR code with Expo Go on a device. Screens live in `src/app` (file-based routing).

## Verification

```sh
{{pm}} run lint
{{pm}} run format:check
{{pm}} test
{{pm}} run doctor
```

## Notes

- Add native modules with `npx expo install <package>` so versions match this Expo SDK.
- `app.json` contains placeholder identifiers (`com.example.*`). Change the iOS bundle identifier and Android package before publishing.
- Only `EXPO_PUBLIC_*` variables reach the app bundle. Never put secrets in them; keep secrets on your backend.
- Builds and store releases use [EAS](https://docs.expo.dev/eas/): `npx eas-cli build`.
