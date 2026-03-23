# Artist Ritual — 다음에 실행할 명령어

베타 배포를 위해 **아래 순서대로** 실행하세요.

---

## 1. 사전 준비 (최초 1회)

```bash
npm install -g eas-cli
npx expo login
```

(Expo 계정이 없으면 `npx expo register`로 가입)

---

## 2. Android APK 빌드 (가장 먼저)

```bash
cd mobile
npm run build:android:preview
```

- 빌드 완료 후 **다운로드 링크**가 생성됩니다
- 이 링크를 **Android 사용자**에게 전달
- Google Play 계정 없이 배포 가능

---

## 3. iOS TestFlight 빌드

```bash
cd mobile
npm run build:ios:testflight
```

**필요 조건:**
- Apple Developer 계정 (연 $99)
- [App Store Connect](https://appstoreconnect.apple.com)에서 앱 등록

**빌드 후:**
- Expo 대시보드에서 `.ipa` 다운로드
- [Transporter](https://apps.apple.com/app/transporter/id1450874784)로 App Store Connect 업로드
- App Store Connect → TestFlight → 외부 테스터 초대

---

## 4. 테스터에게 보낼 메시지 (예시)

```
안녕하세요. 베타 테스트용 앱 링크예요.
설치 후 사용해보시고, 가입/업로드/저장/알림 쪽에서 불편한 점 있으면 알려주세요.
```

---

## 차단 요인 (Blockers)

| 항목 | Android | iOS |
|------|---------|-----|
| Expo 계정 | 필요 | 필요 |
| Apple Developer | 불필요 | **필요** ($99/년) |
| Google Play | 불필요 | 불필요 |

**iOS TestFlight 없이** iPhone 테스터에게 배포하려면:
- 기기 UDID 등록 후 `preview` 프로필로 내부 배포 (최대 100대)
- `eas build -p ios --profile preview`
