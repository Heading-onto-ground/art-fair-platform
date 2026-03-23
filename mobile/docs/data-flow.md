# Artist Ritual — Data Flow & Consistency

## Overview

- **Mobile**: Records moments, displays streak, uses API + AsyncStorage
- **Backend**: Stores moments, serves GET/POST `/api/artist/moments`
- **Web** (future): Displays ritual summary on artist profile via `/api/artist/public/[artistId]/ritual-summary`

## Moments Data Flow

### Load (momentsStore.load)

1. Fetch from `GET /api/artist/moments` and read AsyncStorage in parallel
2. **If API ok**: Merge API moments + local-only moments (ids like `moment-xxx`)
   - Dedupe by id (API wins)
   - Sort by `createdAt` desc
3. **If API fail**: Use AsyncStorage only, sorted by `createdAt` desc

### Create (moment.tsx saveMoment)

1. Try `POST /api/artist/moments` first
2. **If API ok**: `addMoment(apiResult.moment)` — server id, server imageUrl
3. **If API fail**: `addMoment(momentForLocal)` — client id `moment-${Date.now()}`, local imageUri (file:// or data:)

### addMoment (momentsStore)

- Saves to AsyncStorage
- Prepends to state (with dedupe by id)
- Sorts by `createdAt` desc

## Consistency Rules

- **No duplicates**: Merge dedupes by id. addMoment checks exists before adding.
- **Ordering**: Always `createdAt` desc.
- **Image URIs**: API returns `imageUri` (backend stores as `imageUrl`). Local can have `file://` or `data:`. Both work in React Native Image.
- **Local-only preservation**: When API succeeds, client-generated moments (`moment-*`) not in API response are kept in the merged list.

## Streak Calculation

- Uses `createdAt` of moments
- Unique dates only (Set)
- Consecutive days from today or yesterday
- Same logic in mobile (`utils/streak.ts`) and backend (`lib/artistRitual.ts`)

## Web Profile Integration

**Endpoint**: `GET /api/artist/public/[artistId]/ritual-summary`

**Response** (`ArtistRitualSummary`):

```json
{
  "currentStreak": 7,
  "totalRitualPosts": 42,
  "recentPracticeLogs": [
    { "id": "...", "date": "2025-03-16T...", "state": "working", "medium": "painting" }
  ]
}
```

**Web consumption** (when adding UI):

```ts
const res = await fetch(`/api/artist/public/${artistId}/ritual-summary`);
const data = await res.json();
if (res.ok) {
  // data.currentStreak, data.totalRitualPosts, data.recentPracticeLogs
}
```
