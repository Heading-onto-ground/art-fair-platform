# Artist Ritual — 베타 배포 가이드

아티스트 테스터에게 앱을 배포하기 위한 단계입니다.

---

## 사전 준비

### 1. Expo 계정

```bash
npx expo login
```

(또는 `npx expo register`로 새 계정 생성)

### 2. EAS CLI

```bash
npm install -g eas-cli
```

---

## Android 빌드 (APK)

```bash
cd mobile
eas build -p android --profile preview
```

- 빌드 완료 후 **다운로드 링크**가 생성됩니다
- 이 링크를 **Android 사용자**에게 전달하면 됩니다
- Google Play 계정 없이도 배포 가능

---

## iOS 빌드 (TestFlight)

### 1. Apple Developer 계정

- [Apple Developer Program](https://developer.apple.com/programs/) 가입 필요 (연 $99)
- [App Store Connect](https://appstoreconnect.apple.com)에서 앱 등록

### 2. 빌드 실행

```bash
cd mobile
eas build -p ios --profile preview-ios-testflight
```

- 빌드 완료 후 Expo 대시보드에서 **.ipa** 다운로드
- [Transporter](https://apps.apple.com/app/transporter/id1450874784) 앱으로 App Store Connect에 업로드
- 또는 `eas submit` 명령어로 자동 제출 (eas.json의 submit 설정 필요)

### 3. TestFlight 초대

1. [App Store Connect](https://appstoreconnect.apple.com) → **TestFlight**
2. **외부 테스터** → **그룹 생성** (예: "Artist Beta")
3. 테스터 **이메일** 추가
4. **초대** 버튼 클릭 → 테스터가 이메일로 초대 링크를 받습니다

---

## 빌드 프로필 요약

| 프로필 | 용도 | Android | iOS |
|--------|------|---------|-----|
| `preview` | 베타 APK (Android) | APK 다운로드 링크 | — |
| `preview-ios-testflight` | 베타 TestFlight (iOS) | — | TestFlight |

---

## 명령어 요약

```bash
# Android APK (테스터용)
npm run build:android:preview

# iOS TestFlight
npm run build:ios:testflight
```

---

## 주의사항

- **iOS**: Apple Developer 계정($99/년) 없으면 TestFlight 불가. 대안: `preview` 프로필로 기기 UDID 등록 후 내부 배포 (최대 100대)
- **Android**: Google Play 계정 없이 APK 링크로 바로 배포 가능
- **첫 빌드**: `eas build` 실행 시 프로젝트를 Expo 계정에 연결할지 묻습니다. 연결하면 빌드 기록이 저장됩니다.
