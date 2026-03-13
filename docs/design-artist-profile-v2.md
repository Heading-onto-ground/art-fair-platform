# ROB Artist Profile Page V2 — Figma-Style Design Spec

> Art Activity Graph 방향: 작가가 전시를 등록하면 타임라인·네트워크·CV가 자동으로 쌓이는 플랫폼

---

## 1. Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--rob-blue` | #0066FF | Primary CTA, links, accents |
| `--rob-blue-hover` | #0052CC | Hover states |
| `--rob-blue-soft` | rgba(0, 102, 255, 0.08) | Soft backgrounds |
| `--rob-bg` | #F8F9FA | Page background |
| `--rob-bg-card` | #FFFFFF | Cards, modals |
| `--rob-text` | #1A1A1A | Primary text |
| `--rob-text-muted` | #6B7280 | Secondary text |
| `--rob-border` | #E5E7EB | Borders |
| Font | Inter (400, 500, 600) | Body |
| Font | Inter 600 / Pretendard | Headings (bold) |

---

## 2. Hero / Header Section

### Desktop (≥768px)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Blurred artwork background - 100% width, ~320px height]        │
│  overlay: linear-gradient(180deg, transparent 40%, #F8F9FA 100%) │
│                                                                  │
│         ┌──────────┐                                            │
│         │  ●●●●●   │  ← 120px circle, object-fit: cover         │
│         │  Avatar  │     border: 4px white, shadow-lg             │
│         └──────────┘                                            │
│                                                                  │
│              Artist Name (H1, 48px, font-weight 600)             │
│         "한 줄 bio — 작업의 개념과 방향을 담은 문장"               │
│                    (24px, #6B7280, max-w 600px)                  │
│                                                                  │
│    [🇰🇷 Korea] [Mixed Media] [7yrs]  ← pill tags, 12px           │
│                                                                  │
│    [Add Exhibition]  [View PDF CV]                              │
│    (bg #0066FF)      (border gray)                               │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────┐
│  [Blur bg 100%]     │
│                     │
│    ┌────────┐       │
│    │ 80px   │       │  ← Avatar 80px on mobile
│    └────────┘       │
│                     │
│  Artist Name        │  ← 28px
│  "한 줄 bio"         │  ← 16px
│                     │
│  [Korea][Media][7y] │  ← wrap, smaller pills
│                     │
│  [Add Exhibition]   │  ← full width
│  [View PDF CV]      │
└─────────────────────┘
```

**Spacing:** Section padding 48px desktop, 24px mobile. Avatar margin-top: -60px (overlap blur).

---

## 3. Timeline Section (핵심)

### Desktop

```
┌─────────────────────────────────────────────────────────────────┐
│  Activity Timeline                    [+ Add Past Exhibition]    │
│  (section title 20px)                 (sticky right / FAB)       │
├─────────────────────────────────────────────────────────────────┤
│  ●── 2025.03                                                        │
│  │   ┌─────────────────────────────────────────────────────────┐  │
│  │   │ [thumb 80×80]  Group Exhibition "Spatial Echo"           │  │
│  │   │                @ Independent Space Seoul               │  │
│  │   │                Curator: 김큐레이터 · With: A, B, C       │  │
│  │   └─────────────────────────────────────────────────────────┘  │
│  ●── 2024.11                                                        │
│  │   ┌─────────────────────────────────────────────────────────┐  │
│  │   │ [thumb]  Open Call Selected · Berlin Gallery             │  │
│  │   └─────────────────────────────────────────────────────────┘  │
│  ●── 2024.06                                                        │
│      ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

### Timeline Card Spec

- **Left:** Vertical line (2px, #E5E7EB), dots (12px circle, #0066FF)
- **Card:** White bg, border 1px #E5E7EB, border-radius 12px, padding 20px
- **Thumbnail:** 80×80, object-fit cover, rounded-lg
- **Title:** 16px semibold
- **Venue:** 14px muted
- **Meta:** 12px, curator + collaborators as pills

### Mobile (375px)

- Timeline line 24px from left
- Card full width, thumb 64×64
- "+ Add Past Exhibition" → FAB bottom-right (56×56, #0066FF)

---

## 4. Works Grid

```
┌─────────────────────────────────────────────────────────────────┐
│  Works · Series Name (optional group header)                     │
├─────────────┬─────────────┬─────────────┐
│ [img 1:1]   │ [img 1:1]   │ [img 1:1]   │  ← 3 cols desktop
│ Title       │ Title       │ Title       │  2 cols tablet
│ 2024 · Oil  │ 2024 · Oil  │ 2023 · ...  │  1 col mobile
└─────────────┴─────────────┴─────────────┘
```

- Masonry optional (CSS columns or library)
- Image aspect ratio 1:1 or 4:5
- Hover: slight scale 1.02, shadow

---

## 5. Exhibitions & Collaborations

- List or card layout
- Each item: Title · Date · Venue · Curator
- Same visual language as Timeline cards

---

## 6. Network Section

```
┌─────────────────────────────────────────────────────────────────┐
│  Collaborated with                                               │
│  ┌─────┐ ┌─────┐ ┌─────┐                                         │
│  │  A  │─│  B  │─│  C  │  ← Circular avatars, connecting lines   │
│  └─────┘ └─────┘ └─────┘   (or simple card list)                │
└─────────────────────────────────────────────────────────────────┘
```

- Avatar 48px, name below
- Optional: SVG line graph between nodes

---

## 7. Footer

- "Share this profile" button (outline style)
- Copy link / Share to Twitter / Share to LinkedIn

---

## 8. Add Exhibition Modal

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  Add Past Exhibition                            [×]     │
├─────────────────────────────────────────────────────────┤
│  Exhibition Title *                                     │
│  [________________________________________]              │
│                                                         │
│  Date Range *                                            │
│  [Start: YYYY-MM-DD]  [End: YYYY-MM-DD]                  │
│                                                         │
│  Venue / Space *                                         │
│  [________________________] 🔍  ← autocomplete           │
│  (Suggestions: Independent Space Seoul, ...)              │
│                                                         │
│  Collaborating Artists                                  │
│  [Multi-select dropdown or tag input]                   │
│  + Add from ROB network                                 │
│                                                         │
│  Curator (optional)                                     │
│  [________________________]                             │
│                                                         │
│  [Cancel]                    [Save Exhibition]          │
└─────────────────────────────────────────────────────────┘
```

### Fields

| Field | Type | Required |
|-------|------|----------|
| Title | text | ✓ |
| Start Date | date | ✓ |
| End Date | date | ✓ |
| Venue | autocomplete (Spaces API) | ✓ |
| Collaborating Artists | multi-select | |
| Curator | text or select | |

---

## 9. Responsive Breakpoints

| Breakpoint | Width | Notes |
|------------|-------|-------|
| Mobile | 375px | Single column, FAB for Add |
| Tablet | 768px | 2-col grids |
| Desktop | 1024px+ | 3-col, full layout |

---

## 10. 구현 경로 및 사용법

| 경로 | 설명 |
|------|------|
| `/artist/public/[artistId]/v2` | 새 디자인의 작가 프로필 페이지 |
| `/artist/public/[artistId]` | 기존 프로필 (타임라인 중심) |

**접근 예시:** `https://rob-roleofbridge.com/artist/public/ART-xxx/v2`

**컴포넌트:**
- `app/artist/public/[artistId]/components/ArtistProfileV2.tsx` — 메인 페이지
- `app/artist/public/[artistId]/components/AddExhibitionModal.tsx` — Add Exhibition 모달
