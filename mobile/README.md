# ROB Artist Ritual — Mobile MVP

Artist-focused activity and ritual app. Record daily practice moments (BeReal-style) and build your **Proof of Practice**.

## Quick Start

```bash
cd mobile
npm install
npx expo start
```

- **iOS Simulator**: Press `i` in the terminal
- **Android Emulator**: Press `a` in the terminal
- **Physical device**: Scan QR code with Expo Go app

## API Configuration

Set `EXPO_PUBLIC_API_URL` in `.env` or `app.config.js`:

```
EXPO_PUBLIC_API_URL=https://art-fair-platform.vercel.app
```

For local development with the Next.js backend:

```
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Auth Flow

- **Login**: `POST /api/auth/login` with `{ role: "artist", email, password }`
- Session is stored in AsyncStorage and used for subsequent requests
- **Note**: Backend uses cookie-based auth. For cross-origin mobile requests, ensure CORS allows credentials. If API fails, app falls back to mock login.

## Moment API

- **Create**: `POST /api/artist/moments` with `{ note, state, medium, imageUrl }`
- `imageUrl` can be a data URI (base64) or URL
- If API fails, moment is saved locally via AsyncStorage

## Beta Distribution

- **Android**: `npm run build:android:preview` → APK 다운로드 링크 생성
- **iOS TestFlight**: `npm run build:ios:testflight` → Apple Developer 계정 필요

자세한 내용은 `BETA_DEPLOY.md`와 `BETA_INSTALL_GUIDE.md`를 참고하세요.

## Test Notification

In Profile → Notifications, tap **"Test notification in 1 minute"** to verify notifications work. (Dev feature; remove in production.)

## Database Migration

After adding `ArtistMoment` model, run:

```bash
npx prisma migrate dev --name add_artist_moment
```

## Files Changed (Summary)

### UX Polish
- `utils/toast.ts` — Error feedback
- `app/(tabs)/moment.tsx` — Loading state, keyboard handling, error handling, press feedback
- `app/(tabs)/feed.tsx` — Empty state
- `app/(tabs)/profile.tsx` — Empty timeline state

### Test Notification
- `services/notifications.ts` — `scheduleTestNotification()`
- `app/(tabs)/profile.tsx` — Test button

### ROB API Integration
- `constants/api.ts` — API base URL
- `services/api/authService.ts` — Login, session storage
- `services/api/momentService.ts` — Create moment
- `utils/image.ts` — URI to base64 for upload
- `lib/auth.ts` — Uses authService, fallback to mock
- `app/api/artist/moments/route.ts` — Backend endpoint
- `prisma/schema.prisma` — ArtistMoment model
