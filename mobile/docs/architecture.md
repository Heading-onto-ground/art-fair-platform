# ROB Artist Ritual — Architecture

Foundation document for Risk Managing AI and future AI agents.  
Last updated: 2025-03.

---

## 1. App Structure

```
mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── _layout.tsx         # Root layout, auth init, splash
│   ├── index.tsx           # Splash / landing
│   ├── login.tsx           # Login screen
│   └── (tabs)/             # Tab navigation
│       ├── _layout.tsx     # Tab bar (Home, Moment, Feed, Profile)
│       ├── index.tsx       # Home (ritual card, streak, recent)
│       ├── moment.tsx      # Record moment (photo, note, state, medium)
│       ├── feed.tsx        # Practice feed (moments list)
│       └── profile.tsx     # Profile, notifications, feedback
├── components/             # Reusable UI
├── constants/              # API URL, theme, mock data
├── lib/                    # Global state (Zustand)
│   ├── auth.ts             # Auth store
│   └── momentsStore.ts     # Moments store
├── services/
│   ├── api/                # ROB API clients
│   │   ├── authService.ts
│   │   └── momentService.ts
│   ├── storage/            # AsyncStorage wrappers
│   │   └── moments.ts
│   └── notifications.ts   # Daily reminder, preferences
├── types/                  # Shared types
└── utils/                  # streak, image, toast
```

---

## 2. State Management

| Store | Location | Purpose |
|-------|----------|---------|
| **Auth** | `lib/auth.ts` | `isLoggedIn`, `userId`, `userEmail`, `login`, `logout`, `initFromStorage` |
| **Moments** | `lib/momentsStore.ts` | `moments`, `loading`, `load`, `addMoment` |

Both use **Zustand**. No Redux or Context.

- **Auth**: Hydrated from AsyncStorage on app start (`initFromStorage`).
- **Moments**: Loaded from API on mount; fallback to AsyncStorage on API failure.

---

## 3. AsyncStorage Usage

| Key | Module | Purpose |
|-----|---------|---------|
| `@rob_session` | `authService.ts` | Session (userId, role, email) after login |
| `@rob_artist_moments` | `services/storage/moments.ts` | Local moments when API fails |
| `@rob_notification_enabled` | `services/notifications.ts` | Daily reminder on/off |

---

## 4. API Integration Structure

**Base URL**: `constants/api.ts` → `EXPO_PUBLIC_API_URL` or `https://art-fair-platform.vercel.app`

| Endpoint | Method | Service | Purpose |
|----------|--------|---------|---------|
| `/api/auth/login` | POST | `authService.ts` | Login, store session |
| `/api/artist/moments` | GET | `momentService.ts` | Fetch moments |
| `/api/artist/moments` | POST | `momentService.ts` | Create moment |

Auth uses **cookie-based** session (`credentials: "include"`). Mobile must send cookies for authenticated requests.

---

## 5. Fallback Strategy When API Fails

| Flow | Primary | Fallback |
|------|---------|----------|
| **Login** | API login → store session | If API fails, accept any email+password and mock login (`userId: "artist-1"`) |
| **Load moments** | `fetchMoments()` | If `!ok`, load from `getMoments()` (AsyncStorage) |
| **Create moment** | `createMoment()` | If `!ok` or error, save locally via `addMoment(momentForLocal)` |

Moments store always merges API result with local; on API failure it uses local only.

---

## 6. Notification Flow

1. **Permission**: `requestNotificationPermission()` → Expo Notifications
2. **Preference**: `getNotificationPreference()` / `saveNotificationPreference()` → AsyncStorage
3. **Schedule**: `scheduleDailyRitualNotification()` → 8 PM daily
4. **Cancel**: `cancelDailyRitualNotification()` → clears all

Profile screen loads preference, toggles switch, and schedules/cancels accordingly.

---

## 7. Data Flow Summary

```
App Start
  → initFromStorage (auth)
  → Splash → Login or (tabs)

( tabs ) Home
  → load() from momentsStore
  → fetchMoments() → on fail → getMoments()
  → calculateStreak(), hasRecordedToday()

( tabs ) Moment
  → createMoment() → on fail → addMoment(local)
  → router.replace("/(tabs)")

( tabs ) Profile
  → getNotificationPreference()
  → scheduleDailyRitualNotification() if enabled
```

---

## 8. Local Development Notes

- **API**: Point `EXPO_PUBLIC_API_URL` to local backend or leave default for Vercel.
- **Mock auth**: When API returns error, any email+password logs in as mock user.
- **Web**: `expo start --web` for web build; E2E tests use `expo export -p web` + `serve dist`.
