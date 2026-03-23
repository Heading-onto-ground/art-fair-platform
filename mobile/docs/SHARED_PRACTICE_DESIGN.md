# Shared Practice — 네트워크 효과 설계

BeReal보다 더 강한 네트워크 효과를 만드는 핵심 설계.

---

## 1. BeReal vs Artist Ritual

| BeReal | Artist Ritual |
|--------|---------------|
| 동시 포스팅 | **같이 작업하고 있다는 감각** |
| random notification → everyone posts | artists practicing at the same time |
| 순간 이벤트 | **Practice Session** |

---

## 2. 핵심 아이디어

> "동시에 올리는 것"보다 강한 네트워크 효과는  
> **"같이 작업하고 있다는 감각"**이다.

### Shared Practice Session

```
Practice Session

Seoul · Berlin · Tokyo · New York

23 artists practicing now

🎨 Drawing  🖌 Painting  💻 Digital  🧱 Sculpture
```

- 작은 카드: artist recording practice, studio photo, work in progress
- 단순 SNS가 아니라 **"같이 작업하는 감각"**

---

## 3. 왜 강력한가

작가들은 기본적으로 **외로운 직업**이다.

> 지금 다른 작가들은 뭐 하고 있을까?

이 질문을 해결하는 순간, 앱은 **피드가 아니라 공간**이 된다.

| | |
|---|---|
| Instagram | gallery |
| Artist Ritual | **studio** |

---

## 4. 행동 변화

### 일반 SNS
```
record → post → leave
```

### Shared Practice
```
open app → see artists working → start working → record moment
```

**앱이 작업 트리거가 된다.**

---

## 5. 네트워크 효과

| 일반 SNS | Artist Ritual |
|----------|---------------|
| followers | **practice community** |
| likes | people come to **work** |
| perform | not to **perform** |

---

## 6. 앱 정체성 (카피 후보)

- **A place where artists show up to work.**
- **The studio where artists meet.**

---

## 7. 구현 상태

### ✅ 이미 구현됨
- `GET /api/artist/moments?recent=true` — last 30 min
- Feed: "🔥 Artists working now" + medium chips
- ROB Practice Layer + Practice Graph

### 다음 단계
- **Practice Session** UI: 도시별 / 매체별 그룹
- **Studio View**: 피드가 아니라 작업실들

---

## 8. ⚠️ 가장 위험한 함정

> artists don't record

대부분 이런 앱이 실패하는 이유.

### 해결: UX 설계

| ❌ | ✅ |
|---|---|
| 작업 → 기록 | **작업하면서 기록** |
| record = post | recording = **part of working** |

**Recording must feel like part of working.**

---

## 9. ROB 연결

```
Artist Ritual
    ↓
practice data
    ↓
ROB profile (streak, sessions, active days, practice graph)
    ↓
exhibition / open call
```

작가의 **시간 기록**이 생긴다.  
→ "Proof of Practice for Artists"
