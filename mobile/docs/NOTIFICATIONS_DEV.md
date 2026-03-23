# 알림 기능 개발 가이드

Expo Go에서는 **푸시/로컬 알림**이 제한됩니다. 알림을 테스트하려면 **development build**를 사용하세요.

---

## 방법 1: 로컬 빌드 (Mac + Xcode 필요)

### iOS

```bash
cd mobile
npm run run:ios
```

- Xcode가 설치된 Mac 필요
- 시뮬레이터 또는 연결된 iPhone에서 실행
- **로컬 알림** (매일 9시 리추얼 콜) 정상 동작

### Android

```bash
cd mobile
npm run run:android
```

- Android Studio / SDK 필요
- 에뮬레이터 또는 연결된 기기에서 실행

---

## 방법 2: EAS로 개발 빌드 생성

로컬 환경 없이 EAS 클라우드에서 빌드합니다.

### iOS

```bash
cd mobile
npm run build:dev:ios
```

- 빌드 완료 후 **다운로드 링크** 또는 **QR 코드**로 기기에 설치
- 기기 UDID 등록이 필요할 수 있음 (내부 배포)

### Android

```bash
cd mobile
npm run build:dev:android
```

- APK 다운로드 링크로 설치

---

## 요약

| 환경 | Expo Go | Development Build |
|------|---------|-------------------|
| 로컬 알림 (매일 9시) | ⚠️ 제한적 | ✅ 정상 |
| 푸시 알림 (원격) | ❌ 미지원 | ✅ 정상 |

**알림 기능이 필요하면** `npm run run:ios` 또는 `npm run build:dev:ios`로 development build를 사용하세요.
