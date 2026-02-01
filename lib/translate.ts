type Lang = "en" | "ko";

type Dictionary = {
  [key: string]: {
    [lang: string]: string;
  };
};

const dictionary: Dictionary = {
  enter: {
    en: "Enter",
    ko: "입장",
    ja: "入場",
    fr: "Entrée"
  },
  artist: {
    en: "Artist",
    ko: "작가",
    ja: "作家",
    fr: "Artiste"
  },
  gallery: {
    en: "Gallery",
    ko: "갤러리",
    ja: "ギャラリー"
  },
  home_title: {
    en: "Global Art Fair Platform",
    ko: "글로벌 아트페어 플랫폼",
    ja: "グローバルアートフェアプラットフォーム"
  },
  home_subtitle: {
    en: "You are entering a global exhibition network.",
    ko: "글로벌 전시 네트워크에 입장합니다.",
    ja: "グローバル展示ネットワークへようこそ。"
  },
  login_title: {
    en: "Login",
    ko: "로그인",
    ja: "ログイン"
  },
  signup_title: {
    en: "Sign up",
    ko: "회원가입",
    ja: "サインアップ"
  },
  refresh: {
    en: "Refresh",
    ko: "새로고침",
    ja: "更新"
  },
  open_calls_title: {
    en: "Open Calls",
    ko: "오픈콜",
    ja: "オープンコール"
  },
  artist_page_title: {
    en: "Artist",
    ko: "아티스트",
    ja: "アーティスト"
  },
  gallery_page_title: {
    en: "Gallery",
    ko: "갤러리",
    ja: "ギャラリー"
  },
  my_profile: {
    en: "My Profile",
    ko: "내 프로필",
    ja: "マイプロフィール"
  },
  open_calls: {
    en: "Open Calls",
    ko: "오픈콜",
    ja: "オープンコール"
  },
  galleries: {
    en: "Galleries",
    ko: "갤러리",
    ja: "ギャラリー"
  },
  artists: {
    en: "Artists",
    ko: "작가",
    ja: "作家"
  },
  my_open_calls: {
    en: "My Open Calls",
    ko: "내 오픈콜",
    ja: "私のオープンコール"
  },
  login: {
    en: "Login",
    ko: "로그인",
    ja: "ログイン"
  },
  logout: {
    en: "Logout",
    ko: "로그아웃",
    ja: "ログアウト"
  }
};

export function t(key: string, lang: string = "en") {
  return dictionary[key]?.[lang] || key;
}
