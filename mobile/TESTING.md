# Artist Ritual — Testing Guide

Exact commands for local development and CI. Run from the `mobile/` directory unless noted.

## Prerequisites

- Node.js 20+
- `npm ci` (or `npm install`) to sync dependencies

## Commands

### Run the app

```bash
cd mobile
npm start
```

Then:
- **Web**: Open http://localhost:8081 (or the URL shown)
- **iOS**: `npm run ios` (requires Xcode/simulator)
- **Android**: `npm run android` (requires emulator/device)

### Unit tests

```bash
cd mobile
npm test
```

Runs Vitest. Use `npm run test:watch` for watch mode.

### Build (web export)

```bash
cd mobile
npm run build
```

Exports to `dist/`. **Note**: `expo export -p web` can be affected by network/firewall and may take 1–2 minutes. If it fails locally, check network before assuming code issues. Requires `react-native-web` (run `npx expo install react-native-web` if missing).

### E2E tests (Playwright)

**Important**: E2E tests run against the built web bundle. You must build first.

```bash
cd mobile
npm run build
npm run test:e2e
```

Playwright serves `dist/` on port 3000 and runs tests against it. In CI, this is automatic.

### Lint & Typecheck

```bash
cd mobile
npm run lint
npm run typecheck
```

## CI Workflow

The `.github/workflows/ci.yml` pipeline runs:

1. `npm ci` (uses `mobile/package-lock.json`)
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test` (unit)
5. `npm run build` (web export)
6. `npm run test:e2e` (Playwright)

**Package lock**: After adding or updating dependencies, run `npm install` in `mobile/` to update `package-lock.json`. CI uses `npm ci` and will fail if the lock file is out of sync.

## CI Audit Checklist

- [ ] `mobile/package.json` scripts match CI: `lint`, `typecheck`, `test`, `build`, `test:e2e`
- [ ] `package-lock.json` is committed and in sync (run `npm install` after any dependency change)
- [ ] Playwright uses `npx serve dist -l 3000` in CI; build outputs to `dist/`
- [ ] Node 20, `cache-dependency-path: mobile/package-lock.json`
