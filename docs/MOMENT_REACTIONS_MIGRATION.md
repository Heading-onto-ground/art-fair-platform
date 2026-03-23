# Moment Reactions — DB 마이그레이션

리액션 기능을 위해 `MomentReaction` 모델이 추가되었습니다.

## 마이그레이션 실행

DATABASE_URL이 설정된 환경에서:

```bash
npx prisma db push
```

또는 마이그레이션 사용 시:

```bash
npx prisma migrate dev --name add_moment_reactions
```

## 스키마

```prisma
model MomentReaction {
  id           String       @id @default(cuid())
  momentId     String
  moment       ArtistMoment @relation(...)
  userId       String
  reactionType String       // fire | mind_blown | eyes | brain
  createdAt    DateTime     @default(now())

  @@unique([momentId, userId])
}
```
