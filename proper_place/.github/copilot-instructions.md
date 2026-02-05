# Copilot instructions — Proper Place

Goal: help code-writing agents be immediately productive across the two related apps in this workspace: the Flutter mobile app (`proper_place/`) and the web React app (`Proper_Place_Base44_Version_1/`). Keep changes minimal, match existing style, and prefer small, testable edits.

- Quick orientation:
  - Mobile app: `proper_place/` — Flutter project. Entry: `lib/main.dart`. Config: `pubspec.yaml`. Native folders: `android/`, `ios/Runner/`.
  - Web app: `Proper_Place_Base44_Version_1/` — Vite + React + Tailwind. Entry: `src/main.jsx`. Build: `npm run build` (Vite produces `dist`). Key files: `package.json`, `vite.config.js`, `src/`, `src/pages/`, `src/components/`.

- Big-picture architecture (what to know first):
  - The two apps are separate deliverables that share product intent but are implemented independently. Treat them as independent modules when changing build/test flows.
  - Web app uses `@base44/sdk` for backend integration. Primary API client: `src/api/base44Client.js`. App config values come from `src/lib/app-params.js` and environment variables prefixed with `VITE_`.
  - React data-fetching uses `@tanstack/react-query` (`src/lib/query-client.js`) and an `AuthContext` provider (`src/lib/AuthContext.jsx`) that centralizes auth and app public-settings logic.
  - UI is organized with `src/pages/` for routable pages and `src/components/` for shared UI. Tailwind CSS and `@base44/vite-plugin` are used for styling/build needs.

- Developer workflows & commands (explicit):
  - Web (dev):
    - Start dev server: `cd Proper_Place_Base44_Version_1 && npm install && npm run dev`
    - Build for production: `npm run build` (output `dist`)
    - Capacitor flow (if packaging for mobile): build then sync: `npm run build && npx cap sync --web-dir=dist`
  - Mobile (Flutter):
    - Install deps: `cd proper_place && flutter pub get`
    - Run on device/emulator: `flutter run`
    - Build release: `flutter build apk` / `flutter build ios`
  - Important: iOS native changes require opening `ios/Runner.xcworkspace` in Xcode and may require `pod install` in `ios/`.

- Conventions & patterns to follow (project-specific):
  - Web: use absolute imports via `@/` (configured in `jsconfig.json`); prefer `src/pages/*` for route-level components and `src/components/*` for reusable UI.
  - App params: runtime configuration often comes from URL search params or `import.meta.env` (see `src/lib/app-params.js`). When debugging auth/config issues, inspect URL query params.
  - Auth flow: `AuthContext` first fetches public app settings then conditionally calls `base44.auth.me()`. Handle `auth_required` and `user_not_registered` error types explicitly (see `AuthContext.jsx`).
  - Network clients: `src/api/base44Client.js` uses `@base44/sdk` and sometimes raw axios clients (see `createAxiosClient` usage in `AuthContext.jsx`). Preserve headers like `X-App-Id` when making server calls.

- Integration points & external dependencies to watch:
  - `@base44/sdk` — central SDK for auth and API calls.
  - Environment variables: `VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL` and other `VITE_` vars control runtime behavior.
  - Capacitor (not yet committed): packaging web app to native requires `npx cap init` with `webDir=dist`, then `npx cap add android|ios` and `npx cap sync`.

- Testing & linting:
  - Web: lint via `npm run lint`. There is a `typecheck` script using `tsc` with `jsconfig.json`.
  - Mobile: Flutter tests live in `test/` and run via `flutter test`.

- Files to open first for context (quick links):
  - `Proper_Place_Base44_Version_1/package.json` — build scripts and deps
  - `Proper_Place_Base44_Version_1/src/lib/app-params.js` — runtime config behavior
  - `Proper_Place_Base44_Version_1/src/lib/AuthContext.jsx` — auth flow and error handling
  - `Proper_Place_Base44_Version_1/src/api/base44Client.js` — API client
  - `proper_place/lib/main.dart` — Flutter app entry (mobile)

- Style & PR guidance for AI edits:
  - Make focused PRs that change one concern at a time (UI, API client, build config). Keep diffs small.
  - Prefer modifying `src/components/*` and `src/pages/*` for web UI changes; avoid rewriting global build or tooling unless necessary.
  - When touching auth or API code, include a short manual test plan (steps to reproduce) in the PR description.

## CI & GitHub Actions
- Primary workflows: run web lint/typecheck/build and Flutter tests. Example steps for a CI job:
  - Checkout, install Node and Java (for Android), install Flutter SDK (or use prebuilt images)
  - `cd Proper_Place_Base44_Version_1 && npm ci && npm run lint && npm run build`
  - `cd proper_place && flutter pub get && flutter test`
- Cache: persist `~/.npm`/`node_modules` (or use `npm ci`) and Flutter pub cache between runs to speed up builds.
- If adding Capacitor in CI, run `npx cap sync --web-dir=Proper_Place_Base44_Version_1/dist` after the web build.

## Capacitor & Native build notes
- The web app's build output is `Proper_Place_Base44_Version_1/dist` (Vite default) — use this for `webDir` when running `npx cap init` or `npx cap sync`.
- Common commands (run locally):
  ```bash
  cd Proper_Place_Base44_Version_1
  npm install
  npm run build
  npx cap init "Proper Place" com.properplace.app --web-dir=dist
  npx cap add android
  npx cap add ios   # macOS only, requires Xcode
  npx cap sync
  npx cap open android
  npx cap open ios
  ```
- iOS notes: open the generated Xcode workspace at `ios/App/App.xcworkspace` (or `ios/` path created by Capacitor), run `pod install` if CocoaPods are required, and ensure Xcode command-line tools are installed.
- Android notes: ensure `ANDROID_HOME`/`ANDROID_SDK_ROOT` are configured and the required SDKs/NDKs are installed for Gradle builds.

## Environment variables (important runtime keys)
- `VITE_BASE44_APP_ID` — Base44 app id used by `src/lib/app-params.js`.
- `VITE_BASE44_BACKEND_URL` — Backend URL used for API calls.
- Common runtime overrides: `access_token`, `app_id`, `server_url`, `from_url` and `functions_version` may be provided as URL search params and are persisted to localStorage (see `src/lib/app-params.js`).

## Project-specific conventions
- Absolute imports: use `@/` (configured in `jsconfig.json`), e.g., `import { base44 } from '@/api/base44Client'`.
- Auth and app configuration: `AuthContext.jsx` first fetches app public settings via a `createAxiosClient` call to `${serverUrl}/api/apps/public` and then conditionally calls `base44.auth.me()`; look for handling of `auth_required` and `user_not_registered` error types.
- Keep UI changes limited to `src/components/*` or `src/pages/*` for small PRs; avoid touching build tooling unless necessary.

## Troubleshooting & tips
- If a runtime value seems missing, check URL search params — `app-params` will persist them to localStorage.
- When debugging auth failures, check `src/lib/AuthContext.jsx` logs — it reports the SDK response status and `extra_data.reason` for app-level errors.
- If CI fails on macOS/iOS steps, verify CocoaPods are installed and Xcode command-line tools are available.

## Files to inspect when working on a change
- Web: `Proper_Place_Base44_Version_1/package.json`, `src/lib/app-params.js`, `src/lib/AuthContext.jsx`, `src/api/base44Client.js`, `vite.config.js`.
- Mobile: `proper_place/lib/main.dart`, `proper_place/pubspec.yaml`, `proper_place/ios/Runner.xcworkspace`.

If you'd like, I can also create a `/.github/workflows/ci.yml` skeleton tailored to this repo — tell me whether you want Linux-only, or include macOS for iOS builds.
# Copilot instructions — Proper Place

Goal: help code-writing agents be immediately productive across the two related apps in this workspace: the Flutter mobile app (`proper_place/`) and the web React app (`Proper_Place_Base44_Version_1/`). Keep changes minimal, match existing style, and prefer small, testable edits.

- Quick orientation:
  - Mobile app: `proper_place/` — Flutter project. Entry: `lib/main.dart`. Config: `pubspec.yaml`. Native folders: `android/`, `ios/Runner/`.
  - Web app: `Proper_Place_Base44_Version_1/` — Vite + React + Tailwind. Entry: `src/main.jsx`. Build: `npm run build` (Vite produces `dist`). Key files: `package.json`, `vite.config.js`, `src/`, `src/pages/`, `src/components/`.

- Big-picture architecture (what to know first):
  - The two apps are separate deliverables that share product intent but are implemented independently. Treat them as independent modules when changing build/test flows.
  - Web app uses `@base44/sdk` for backend integration. Primary API client: `src/api/base44Client.js`. App config values come from `src/lib/app-params.js` and environment variables prefixed with `VITE_`.
  - React data-fetching uses `@tanstack/react-query` (`src/lib/query-client.js`) and an `AuthContext` provider (`src/lib/AuthContext.jsx`) that centralizes auth and app public-settings logic.
  - UI is organized with `src/pages/` for routable pages and `src/components/` for shared UI. Tailwind CSS and `@base44/vite-plugin` are used for styling/build needs.

- Developer workflows & commands (explicit):
  - Web (dev):
    - Start dev server: `cd Proper_Place_Base44_Version_1 && npm install && npm run dev`
    - Build for production: `npm run build` (output `dist`)
    - Capacitor flow (if packaging for mobile): build then sync: `npm run build && npx cap sync --web-dir=dist`
  - Mobile (Flutter):
    - Install deps: `cd proper_place && flutter pub get`
    - Run on device/emulator: `flutter run`
    - Build release: `flutter build apk` / `flutter build ios`
  - Important: iOS native changes require opening `ios/Runner.xcworkspace` in Xcode and may require `pod install` in `ios/`.

- Conventions & patterns to follow (project-specific):
  - Web: use absolute imports via `@/` (configured in `jsconfig.json`); prefer `src/pages/*` for route-level components and `src/components/*` for reusable UI.
  - App params: runtime configuration often comes from URL search params or `import.meta.env` (see `src/lib/app-params.js`). When debugging auth/config issues, inspect URL query params.
  - Auth flow: `AuthContext` first fetches public app settings then conditionally calls `base44.auth.me()`. Handle `auth_required` and `user_not_registered` error types explicitly (see `AuthContext.jsx`).
  - Network clients: `src/api/base44Client.js` uses `@base44/sdk` and sometimes raw axios clients (see `createAxiosClient` usage in `AuthContext.jsx`). Preserve headers like `X-App-Id` when making server calls.

- Integration points & external dependencies to watch:
  - `@base44/sdk` — central SDK for auth and API calls.
  - Environment variables: `VITE_BASE44_APP_ID`, `VITE_BASE44_BACKEND_URL` and other `VITE_` vars control runtime behavior.
  - Capacitor (not yet committed): packaging web app to native requires `npx cap init` with `webDir=dist`, then `npx cap add android|ios` and `npx cap sync`.

- Testing & linting:
  - Web: lint via `npm run lint`. There is a `typecheck` script using `tsc` with `jsconfig.json`.
  - Mobile: Flutter tests live in `test/` and run via `flutter test`.

- Files to open first for context (quick links):
  - `Proper_Place_Base44_Version_1/package.json` — build scripts and deps
  - `Proper_Place_Base44_Version_1/src/lib/app-params.js` — runtime config behavior
  - `Proper_Place_Base44_Version_1/src/lib/AuthContext.jsx` — auth flow and error handling
  - `Proper_Place_Base44_Version_1/src/api/base44Client.js` — API client
  - `proper_place/lib/main.dart` — Flutter app entry (mobile)

- Style & PR guidance for AI edits:
  - Make focused PRs that change one concern at a time (UI, API client, build config). Keep diffs small.
  - Prefer modifying `src/components/*` and `src/pages/*` for web UI changes; avoid rewriting global build or tooling unless necessary.
  - When touching auth or API code, include a short manual test plan (steps to reproduce) in the PR description.

If anything above is unclear or you want this file placed in a different repository root (for the web app instead), tell me which path to use and I will update. Feedback requested: are there additional local scripts or platform notes you rely on (e.g., custom npm scripts, CI steps, secrets in env files) I should include?