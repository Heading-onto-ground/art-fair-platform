type Lang = "en" | "ko" | "ja" | "fr";

type Dictionary = {
  [key: string]: {
    [lang: string]: string;
  };
};

const dictionary: Dictionary = {
  // ──────────────────────────────────────────
  // Common / Shared
  // ──────────────────────────────────────────
  enter: { en: "Enter", ko: "입장", ja: "入場", fr: "Entrée" },
  artist: { en: "Artist", ko: "작가", ja: "アーティスト", fr: "Artiste" },
  gallery: { en: "Gallery", ko: "갤러리", ja: "ギャラリー", fr: "Galerie" },
  refresh: { en: "Refresh", ko: "새로고침", ja: "更新", fr: "Actualiser" },
  loading: { en: "Loading...", ko: "로딩 중...", ja: "読み込み中...", fr: "Chargement..." },
  save: { en: "Save", ko: "저장", ja: "保存", fr: "Enregistrer" },
  cancel: { en: "Cancel", ko: "취소", ja: "キャンセル", fr: "Annuler" },
  submit: { en: "Submit", ko: "제출", ja: "送信", fr: "Soumettre" },
  apply: { en: "Apply", ko: "지원하기", ja: "応募する", fr: "Postuler" },
  applied: { en: "Applied", ko: "지원 완료", ja: "応募済み", fr: "Postulé" },
  details: { en: "Details", ko: "상세보기", ja: "詳細", fr: "Détails" },
  message: { en: "Message", ko: "메시지", ja: "メッセージ", fr: "Message" },
  back: { en: "Back", ko: "뒤로", ja: "戻る", fr: "Retour" },
  close: { en: "Close", ko: "닫기", ja: "閉じる", fr: "Fermer" },
  deadline: { en: "Deadline", ko: "마감일", ja: "締切", fr: "Date limite" },
  country: { en: "Country", ko: "국가", ja: "国", fr: "Pays" },
  city: { en: "City", ko: "도시", ja: "都市", fr: "Ville" },
  email: { en: "Email", ko: "이메일", ja: "メール", fr: "Email" },
  password: { en: "Password", ko: "비밀번호", ja: "パスワード", fr: "Mot de passe" },
  name: { en: "Name", ko: "이름", ja: "名前", fr: "Nom" },
  bio: { en: "Bio", ko: "소개", ja: "自己紹介", fr: "Bio" },
  website: { en: "Website", ko: "웹사이트", ja: "ウェブサイト", fr: "Site web" },
  status: { en: "Status", ko: "상태", ja: "ステータス", fr: "Statut" },
  all: { en: "ALL", ko: "전체", ja: "すべて", fr: "TOUT" },
  global: { en: "Global", ko: "글로벌", ja: "グローバル", fr: "Global" },

  // ──────────────────────────────────────────
  // TopBar / Navigation
  // ──────────────────────────────────────────
  nav_profile: { en: "Profile", ko: "프로필", ja: "プロフィール", fr: "Profil" },
  nav_open_calls: { en: "Open Calls", ko: "오픈콜", ja: "オープンコール", fr: "Appels" },
  nav_galleries: { en: "Galleries", ko: "갤러리", ja: "ギャラリー", fr: "Galeries" },
  nav_artists: { en: "Artists", ko: "작가", ja: "アーティスト", fr: "Artistes" },
  nav_shipments: { en: "Shipments", ko: "배송", ja: "配送", fr: "Expéditions" },
  nav_messages: { en: "Messages", ko: "메시지", ja: "メッセージ", fr: "Messages" },
  nav_my_calls: { en: "My Calls", ko: "내 오픈콜", ja: "マイコール", fr: "Mes appels" },
  nav_growth: { en: "Growth", ko: "성장", ja: "成長", fr: "Croissance" },
  nav_logout: { en: "Logout", ko: "로그아웃", ja: "ログアウト", fr: "Déconnexion" },
  notifications: { en: "Notifications", ko: "알림", ja: "通知", fr: "Notifications" },
  mark_all_read: { en: "Mark all read", ko: "모두 읽음", ja: "すべて既読", fr: "Tout marquer lu" },
  no_notifications: { en: "No notifications", ko: "알림 없음", ja: "通知なし", fr: "Aucune notification" },

  // ──────────────────────────────────────────
  // Main Page (Home)
  // ──────────────────────────────────────────
  home_badge: { en: "Global Art Network", ko: "글로벌 아트 네트워크", ja: "グローバルアートネットワーク", fr: "Réseau Artistique Mondial" },
  home_title: { en: "Role of Bridge", ko: "롤 오브 브릿지", ja: "ロール・オブ・ブリッジ", fr: "Role of Bridge" },
  home_subtitle: { en: "Connecting artists and galleries across borders.\nDiscover, apply, exhibit — worldwide.", ko: "국경을 넘어 작가와 갤러리를 연결합니다.\n발견하고, 지원하고, 전시하세요 — 전 세계에서.", ja: "国境を越えてアーティストとギャラリーをつなぐ。\n発見し、応募し、展示する — 世界中で。", fr: "Connecter artistes et galeries au-delà des frontières.\nDécouvrir, postuler, exposer — dans le monde entier." },
  home_i_am_artist: { en: "I am an Artist", ko: "작가입니다", ja: "アーティストです", fr: "Je suis Artiste" },
  home_i_am_gallery: { en: "I am a Gallery", ko: "갤러리입니다", ja: "ギャラリーです", fr: "Je suis une Galerie" },
  home_artists: { en: "Artists", ko: "작가", ja: "アーティスト", fr: "Artistes" },
  home_galleries: { en: "Galleries", ko: "갤러리", ja: "ギャラリー", fr: "Galeries" },
  home_countries: { en: "Countries", ko: "국가", ja: "カ国", fr: "Pays" },
  home_connections: { en: "Connections", ko: "연결", ja: "つながり", fr: "Connexions" },
  home_how_it_works: { en: "How it works", ko: "이용 방법", ja: "ご利用方法", fr: "Comment ça marche" },
  home_three_steps: { en: "Three simple steps", ko: "간단한 3단계", ja: "簡単3ステップ", fr: "Trois étapes simples" },
  home_step1_title: { en: "Discover", ko: "발견", ja: "発見", fr: "Découvrir" },
  home_step1_desc: { en: "Browse open calls from galleries and institutions around the world.", ko: "전 세계 갤러리와 기관의 오픈콜을 둘러보세요.", ja: "世界中のギャラリーや機関のオープンコールを閲覧。", fr: "Parcourez les appels à candidatures de galeries et institutions du monde entier." },
  home_step2_title: { en: "Connect", ko: "연결", ja: "つながる", fr: "Connecter" },
  home_step2_desc: { en: "Apply directly or chat with curators. Real-time translation included.", ko: "직접 지원하거나 큐레이터와 대화하세요. 실시간 번역 포함.", ja: "直接応募するか、キュレーターとチャット。リアルタイム翻訳付き。", fr: "Postulez directement ou chattez avec les commissaires. Traduction en temps réel incluse." },
  home_step3_title: { en: "Exhibit", ko: "전시", ja: "展示", fr: "Exposer" },
  home_step3_desc: { en: "Ship your artwork globally with integrated logistics and tracking.", ko: "통합 물류와 추적으로 전 세계에 작품을 배송하세요.", ja: "統合された物流と追跡で世界中にアート作品を配送。", fr: "Expédiez vos œuvres dans le monde entier avec logistique et suivi intégrés." },
  home_for_artists: { en: "For Artists", ko: "작가를 위해", ja: "アーティストへ", fr: "Pour les Artistes" },
  home_for_galleries: { en: "For Galleries", ko: "갤러리를 위해", ja: "ギャラリーへ", fr: "Pour les Galeries" },
  home_artist_title: { en: "Show your work to the world", ko: "당신의 작품을 세계에 보여주세요", ja: "あなたの作品を世界に", fr: "Montrez vos œuvres au monde" },
  home_gallery_title: { en: "Discover extraordinary talent", ko: "특별한 재능을 발견하세요", ja: "素晴らしい才能を発見", fr: "Découvrez des talents extraordinaires" },
  home_artist_feat1: { en: "Apply to global open calls", ko: "글로벌 오픈콜에 지원", ja: "グローバルオープンコールに応募", fr: "Postulez aux appels internationaux" },
  home_artist_feat2: { en: "Portfolio hosting", ko: "포트폴리오 호스팅", ja: "ポートフォリオホスティング", fr: "Hébergement de portfolio" },
  home_artist_feat3: { en: "Direct messaging with galleries", ko: "갤러리와 다이렉트 메시지", ja: "ギャラリーとのダイレクトメッセージ", fr: "Messagerie directe avec les galeries" },
  home_artist_feat4: { en: "Find collaboration partners", ko: "콜라보 작가 찾기", ja: "コラボアーティストを探す", fr: "Trouver des partenaires de collaboration" },
  home_artist_feat5: { en: "Share daily life & studio", ko: "작가들 생활 공유", ja: "日常をシェア", fr: "Partager la vie quotidienne" },
  home_artist_feat6: { en: "Community & networking", ko: "커뮤니티 활동", ja: "コミュニティ活動", fr: "Communauté & réseautage" },
  home_artist_feat7: { en: "Shipment tracking", ko: "배송 추적", ja: "配送追跡", fr: "Suivi d'expédition" },
  home_gallery_feat1: { en: "Publish open calls", ko: "오픈콜 게시", ja: "オープンコールを公開", fr: "Publiez des appels" },
  home_gallery_feat2: { en: "Browse artist portfolios", ko: "작가 포트폴리오 탐색", ja: "アーティストのポートフォリオを閲覧", fr: "Parcourez les portfolios" },
  home_gallery_feat3: { en: "Application management", ko: "지원서 관리", ja: "応募管理", fr: "Gestion des candidatures" },
  home_gallery_feat4: { en: "Global artist outreach", ko: "글로벌 작가 지원", ja: "グローバルアーティスト支援", fr: "Soutien aux artistes internationaux" },
  home_gallery_feat5: { en: "Logistics connection", ko: "물류 연결", ja: "物流コネクション", fr: "Connexion logistique" },
  home_begin: { en: "Begin your journey", ko: "여정을 시작하세요", ja: "旅を始めましょう", fr: "Commencez votre voyage" },
  home_explore_country: { en: "Explore by Country", ko: "국가별 탐색", ja: "国別に探す", fr: "Explorer par pays" },
  home_10_countries: { en: "10 Countries, One Network", ko: "10개국, 하나의 네트워크", ja: "10カ国、ひとつのネットワーク", fr: "10 pays, un seul réseau" },

  // ──────────────────────────────────────────
  // Login Page
  // ──────────────────────────────────────────
  login_welcome: { en: "Welcome back", ko: "다시 오신 것을 환영합니다", ja: "おかえりなさい", fr: "Bon retour" },
  login_create: { en: "Create account", ko: "계정 만들기", ja: "アカウント作成", fr: "Créer un compte" },
  login_signin_subtitle: { en: "Sign in to continue", ko: "계속하려면 로그인하세요", ja: "続行するにはログイン", fr: "Connectez-vous pour continuer" },
  login_signup_subtitle: { en: "Join the global art network", ko: "글로벌 아트 네트워크에 참여하세요", ja: "グローバルアートネットワークに参加", fr: "Rejoignez le réseau artistique mondial" },
  login_email_placeholder: { en: "your@email.com", ko: "이메일을 입력하세요", ja: "メールアドレス", fr: "votre@email.com" },
  login_password_placeholder: { en: "••••••••", ko: "비밀번호를 입력하세요", ja: "パスワード", fr: "••••••••" },
  login_signin: { en: "Sign in", ko: "로그인", ja: "ログイン", fr: "Se connecter" },
  login_signup: { en: "Sign up", ko: "회원가입", ja: "サインアップ", fr: "S'inscrire" },
  login_new_here: { en: "New here?", ko: "처음이신가요?", ja: "初めてですか？", fr: "Nouveau ici ?" },
  login_have_account: { en: "Already have an account?", ko: "이미 계정이 있으신가요?", ja: "アカウントをお持ちですか？", fr: "Déjà un compte ?" },
  login_artist_id: { en: "Artist ID", ko: "작가 ID", ja: "アーティストID", fr: "ID Artiste" },
  login_start_year: { en: "Start year", ko: "활동 시작 연도", ja: "活動開始年", fr: "Année de début" },
  login_genre: { en: "Genre", ko: "장르", ja: "ジャンル", fr: "Genre" },
  login_gallery_id: { en: "Gallery ID", ko: "갤러리 ID", ja: "ギャラリーID", fr: "ID Galerie" },
  login_address: { en: "Address", ko: "주소", ja: "住所", fr: "Adresse" },
  login_founded_year: { en: "Founded year", ko: "설립 연도", ja: "設立年", fr: "Année de fondation" },
  login_fill_required: { en: "Please fill in all required fields", ko: "필수 항목을 모두 입력하세요", ja: "必須項目をすべて入力してください", fr: "Veuillez remplir tous les champs obligatoires" },
  login_email_required: { en: "Please enter your email", ko: "이메일을 입력하세요", ja: "メールアドレスを入力してください", fr: "Veuillez entrer votre email" },
  login_password_min: { en: "Password must be at least 6 characters", ko: "비밀번호는 최소 6자 이상이어야 합니다", ja: "パスワードは6文字以上必要です", fr: "Le mot de passe doit contenir au moins 6 caractères" },
  login_password_required: { en: "Please enter your password", ko: "비밀번호를 입력하세요", ja: "パスワードを入力してください", fr: "Veuillez entrer votre mot de passe" },
  login_server_error: { en: "Server error", ko: "서버 오류", ja: "サーバーエラー", fr: "Erreur serveur" },

  // ──────────────────────────────────────────
  // Artist Dashboard
  // ──────────────────────────────────────────
  artist_dashboard: { en: "Dashboard", ko: "대시보드", ja: "ダッシュボード", fr: "Tableau de bord" },
  artist_page_title: { en: "Artist", ko: "아티스트", ja: "アーティスト", fr: "Artiste" },
  artist_browse_desc: { en: "Browse open calls from galleries worldwide", ko: "전 세계 갤러리의 오픈콜을 둘러보세요", ja: "世界中のギャラリーのオープンコールを閲覧", fr: "Parcourez les appels des galeries du monde entier" },
  artist_my_profile: { en: "My Profile", ko: "내 프로필", ja: "マイプロフィール", fr: "Mon Profil" },
  artist_full_list: { en: "Full List", ko: "전체 목록", ja: "全リスト", fr: "Liste complète" },
  artist_community: { en: "Community", ko: "커뮤니티", ja: "コミュニティ", fr: "Communauté" },
  artist_community_title: { en: "Artist Community", ko: "아티스트 커뮤니티", ja: "アーティストコミュニティ", fr: "Communauté d'artistes" },
  artist_community_desc: { en: "Connect with fellow artists, find collaborators, and share your creative journey", ko: "동료 작가들과 교류하고, 콜라보 파트너를 찾고, 작업 일상을 공유하세요", ja: "仲間のアーティストとつながり、コラボ相手を見つけ、創作の日常を共有しましょう", fr: "Connectez-vous avec d'autres artistes, trouvez des collaborateurs et partagez votre parcours créatif" },
  artist_find_collab: { en: "Find Collaborators", ko: "콜라보 찾기", ja: "コラボを探す", fr: "Trouver des collaborateurs" },
  artist_share_daily: { en: "Share Daily Life", ko: "일상 공유", ja: "日常をシェア", fr: "Partager le quotidien" },
  artist_all_posts: { en: "All Posts", ko: "전체 글", ja: "すべての投稿", fr: "Tous les posts" },
  artist_no_open_calls: { en: "No open calls for this region yet", ko: "이 지역의 오픈콜이 아직 없습니다", ja: "この地域のオープンコールはまだありません", fr: "Pas encore d'appels pour cette région" },
  artist_auto_forward: { en: "Auto-forward to gallery", ko: "갤러리로 자동 전달", ja: "ギャラリーへ自動転送", fr: "Transfert automatique à la galerie" },

  // ──────────────────────────────────────────
  // Artist Profile (My Page)
  // ──────────────────────────────────────────
  profile_section: { en: "Profile", ko: "프로필", ja: "プロフィール", fr: "Profil" },
  profile_edit: { en: "Edit Profile", ko: "프로필 수정", ja: "プロフィール編集", fr: "Modifier le profil" },
  profile_portfolio: { en: "Portfolio PDF", ko: "포트폴리오 PDF", ja: "ポートフォリオPDF", fr: "Portfolio PDF" },
  profile_applications: { en: "Applications", ko: "지원 내역", ja: "応募履歴", fr: "Candidatures" },
  profile_invites: { en: "Invites", ko: "초대", ja: "招待", fr: "Invitations" },
  profile_no_name: { en: "No name yet", ko: "이름 미등록", ja: "名前未登録", fr: "Pas encore de nom" },
  profile_complete: { en: "Complete your profile", ko: "프로필을 완성하세요", ja: "プロフィールを完成させてください", fr: "Complétez votre profil" },
  profile_save: { en: "Save Profile", ko: "프로필 저장", ja: "プロフィール保存", fr: "Enregistrer" },
  profile_saved: { en: "Profile saved", ko: "프로필이 저장되었습니다", ja: "プロフィールが保存されました", fr: "Profil enregistré" },
  profile_view_pdf: { en: "View PDF", ko: "PDF 보기", ja: "PDFを見る", fr: "Voir le PDF" },
  profile_replace: { en: "Replace portfolio", ko: "포트폴리오 교체", ja: "ポートフォリオ差し替え", fr: "Remplacer le portfolio" },
  profile_upload: { en: "Upload portfolio", ko: "포트폴리오 업로드", ja: "ポートフォリオアップロード", fr: "Télécharger le portfolio" },
  profile_select_pdf: { en: "Select PDF file", ko: "PDF 파일 선택", ja: "PDFファイルを選択", fr: "Sélectionner un fichier PDF" },
  profile_upload_btn: { en: "Upload PDF", ko: "PDF 업로드", ja: "PDFアップロード", fr: "Télécharger le PDF" },
  profile_no_apps: { en: "No applications yet", ko: "지원 내역이 없습니다", ja: "応募履歴なし", fr: "Aucune candidature" },
  profile_no_invites: { en: "No invites received", ko: "받은 초대가 없습니다", ja: "招待なし", fr: "Aucune invitation reçue" },
  profile_view_details: { en: "View details", ko: "상세보기", ja: "詳細を見る", fr: "Voir les détails" },
  profile_accept: { en: "Accept", ko: "수락", ja: "承諾", fr: "Accepter" },
  profile_decline: { en: "Decline", ko: "거절", ja: "辞退", fr: "Refuser" },
  profile_saving: { en: "Saving...", ko: "저장 중...", ja: "保存中...", fr: "Enregistrement..." },
  profile_uploading: { en: "Uploading...", ko: "업로드 중...", ja: "アップロード中...", fr: "Téléchargement..." },

  // ──────────────────────────────────────────
  // Open Calls Page
  // ──────────────────────────────────────────
  oc_opportunities: { en: "Opportunities", ko: "기회", ja: "機会", fr: "Opportunités" },
  oc_title: { en: "Open Calls", ko: "오픈콜", ja: "オープンコール", fr: "Appels à Candidatures" },
  oc_no_results: { en: "No open calls for this region yet", ko: "이 지역의 오픈콜이 아직 없습니다", ja: "この地域のオープンコールはまだありません", fr: "Pas encore d'appels pour cette région" },
  oc_visit_website: { en: "Visit website", ko: "웹사이트 방문", ja: "ウェブサイトへ", fr: "Visiter le site" },
  oc_auto_forward: { en: "Auto-forward to gallery", ko: "갤러리로 자동 전달", ja: "ギャラリーへ自動転送", fr: "Transfert automatique" },
  oc_contact_gallery: { en: "Contact Gallery", ko: "갤러리 연락", ja: "ギャラリーに連絡", fr: "Contacter la galerie" },
  oc_apply_via_rob: { en: "Apply via ROB", ko: "ROB로 지원", ja: "ROBで応募", fr: "Postuler via ROB" },
  oc_apply_to: { en: "Apply to this open call", ko: "이 오픈콜에 지원하기", ja: "このオープンコールに応募", fr: "Postuler à cet appel" },
  oc_submit_application: { en: "Submit Application", ko: "지원서 제출", ja: "応募する", fr: "Soumettre la candidature" },
  oc_apply_send_email: { en: "Apply & Send Email", ko: "지원 및 이메일 발송", ja: "応募＆メール送信", fr: "Postuler & Envoyer" },
  oc_back_to_list: { en: "Back to list", ko: "목록으로", ja: "リストに戻る", fr: "Retour à la liste" },
  oc_shipping: { en: "Shipping", ko: "배송", ja: "配送", fr: "Expédition" },
  oc_mark_shipped: { en: "Mark as shipped", ko: "발송 완료 처리", ja: "発送済みにする", fr: "Marquer comme expédié" },
  oc_write_message: { en: "Write a short message to the gallery...", ko: "갤러리에 보낼 메시지를 작성하세요...", ja: "ギャラリーへのメッセージを書いてください...", fr: "Écrivez un court message à la galerie..." },
  oc_theme: { en: "Theme", ko: "주제", ja: "テーマ", fr: "Thème" },
  oc_applied_status: { en: "Applied · Status:", ko: "지원 완료 · 상태:", ja: "応募済み · ステータス:", fr: "Postulé · Statut :" },
  oc_application_submitted: { en: "Your application has been submitted. The gallery will review your portfolio and contact you if interested.", ko: "지원이 완료되었습니다. 갤러리에서 포트폴리오를 검토 후 연락드릴 예정입니다.", ja: "応募が完了しました。ギャラリーがポートフォリオを確認し、関心がある場合にご連絡します。", fr: "Votre candidature a été soumise. La galerie examinera votre portfolio et vous contactera si intéressée." },
  oc_add_shipping: { en: "Add shipping info (optional)", ko: "배송 정보 입력 (선택사항)", ja: "配送情報を入力（任意）", fr: "Ajouter les infos d'expédition (facultatif)" },
  oc_hide_shipping: { en: "Hide shipping info", ko: "배송 정보 숨기기", ja: "配送情報を非表示", fr: "Masquer les infos d'expédition" },
  oc_shipping_note: { en: "If you need to ship artwork, fill in the details below. You can add this later.", ko: "작품 배송이 필요한 경우 아래에 정보를 입력하세요. 나중에 추가할 수도 있습니다.", ja: "作品の配送が必要な場合は、以下に情報を入力してください。後で追加することもできます。", fr: "Si vous devez expédier une œuvre, remplissez les détails ci-dessous. Vous pouvez le faire plus tard." },
  oc_carrier: { en: "Carrier (DHL, FedEx...)", ko: "배송업체 (DHL, FedEx...)", ja: "配送業者（DHL, FedEx...）", fr: "Transporteur (DHL, FedEx...)" },
  oc_tracking_number: { en: "Tracking number", ko: "운송장 번호", ja: "追跡番号", fr: "Numéro de suivi" },
  oc_tracking_url: { en: "Tracking URL (optional)", ko: "배송 조회 URL (선택사항)", ja: "追跡URL（任意）", fr: "URL de suivi (facultatif)" },
  oc_shipping_memo: { en: "Shipping note", ko: "배송 메모", ja: "配送メモ", fr: "Note d'expédition" },
  oc_gallery_description: { en: "About Gallery", ko: "갤러리 소개", ja: "ギャラリー紹介", fr: "À propos de la galerie" },
  oc_applications: { en: "Applications", ko: "지원 내역", ja: "応募一覧", fr: "Candidatures" },
  oc_no_applications: { en: "No applications yet", ko: "아직 지원 내역이 없습니다", ja: "まだ応募はありません", fr: "Aucune candidature pour le moment" },
  oc_portfolio: { en: "Portfolio", ko: "포트폴리오", ja: "ポートフォリオ", fr: "Portfolio" },
  oc_reviewing: { en: "Reviewing", ko: "검토 중", ja: "審査中", fr: "En cours d'examen" },
  oc_accept: { en: "Accept", ko: "승인", ja: "承認", fr: "Accepter" },
  oc_reject: { en: "Reject", ko: "거절", ja: "拒否", fr: "Rejeter" },

  // ──────────────────────────────────────────
  // Gallery Dashboard
  // ──────────────────────────────────────────
  gallery_dashboard: { en: "Dashboard", ko: "대시보드", ja: "ダッシュボード", fr: "Tableau de bord" },
  gallery_page_title: { en: "Gallery", ko: "갤러리", ja: "ギャラリー", fr: "Galerie" },
  gallery_create_oc: { en: "Create Open Call", ko: "오픈콜 만들기", ja: "オープンコール作成", fr: "Créer un appel" },
  gallery_my_oc: { en: "My Open Calls", ko: "내 오픈콜", ja: "マイオープンコール", fr: "Mes appels" },
  gallery_messages: { en: "Messages", ko: "메시지", ja: "メッセージ", fr: "Messages" },
  gallery_invites: { en: "Invites", ko: "초대", ja: "招待", fr: "Invitations" },
  gallery_templates: { en: "Invite Templates", ko: "초대 템플릿", ja: "招待テンプレート", fr: "Modèles d'invitation" },
  gallery_publish: { en: "Publish Open Call", ko: "오픈콜 게시", ja: "オープンコール公開", fr: "Publier l'appel" },
  gallery_publishing: { en: "Publishing...", ko: "게시 중...", ja: "公開中...", fr: "Publication..." },
  gallery_theme: { en: "Theme", ko: "주제", ja: "テーマ", fr: "Thème" },
  gallery_deadline: { en: "Deadline (YYYY-MM-DD)", ko: "마감일 (YYYY-MM-DD)", ja: "締切 (YYYY-MM-DD)", fr: "Date limite (AAAA-MM-JJ)" },
  gallery_no_oc: { en: "No open calls yet.", ko: "아직 오픈콜이 없습니다.", ja: "オープンコールはまだありません。", fr: "Pas encore d'appels." },
  gallery_no_chats: { en: "No conversations yet.", ko: "아직 대화가 없습니다.", ja: "会話はまだありません。", fr: "Pas encore de conversations." },
  gallery_no_invites: { en: "No invites yet.", ko: "아직 초대가 없습니다.", ja: "招待はまだありません。", fr: "Pas encore d'invitations." },
  gallery_save_templates: { en: "Save Templates", ko: "템플릿 저장", ja: "テンプレート保存", fr: "Enregistrer les modèles" },

  // ──────────────────────────────────────────
  // Recommendation Banner
  // ──────────────────────────────────────────
  rec_title: { en: "Recommended for you", ko: "맞춤 추천", ja: "おすすめ", fr: "Recommandé pour vous" },
  rec_subtitle: { en: "Based on your profile", ko: "프로필 기반 추천", ja: "プロフィールに基づく", fr: "Basé sur votre profil" },
  rec_match: { en: "Match", ko: "매칭", ja: "マッチ度", fr: "Correspondance" },
  rec_view_all: { en: "View all recommendations", ko: "전체 추천 보기", ja: "すべてのおすすめを見る", fr: "Voir toutes les recommandations" },
  rec_theme_match: { en: "Theme matches your genre", ko: "장르와 일치하는 주제", ja: "ジャンルに合ったテーマ", fr: "Thème correspondant à votre genre" },
  rec_related: { en: "Related theme", ko: "관련 주제", ja: "関連テーマ", fr: "Thème connexe" },
  rec_in_country: { en: "In your country", ko: "국내 기회", ja: "国内の機会", fr: "Dans votre pays" },
  rec_nearby: { en: "Nearby region", ko: "인근 지역", ja: "近隣地域", fr: "Région proche" },
  rec_international: { en: "International opportunity", ko: "해외 기회", ja: "海外の機会", fr: "Opportunité internationale" },
  rec_deadline_soon: { en: "Deadline approaching", ko: "마감 임박", ja: "締切間近", fr: "Date limite approchante" },
  rec_global_inst: { en: "Global institution", ko: "글로벌 기관", ja: "グローバル機関", fr: "Institution mondiale" },

  // ──────────────────────────────────────────
  // Signup Modal
  // ──────────────────────────────────────────
  signup_free: { en: "Free account", ko: "무료 가입", ja: "無料アカウント", fr: "Compte gratuit" },
  signup_apply_title: { en: "Apply to this open call", ko: "이 오픈콜에 지원하기", ja: "このオープンコールに応募", fr: "Postuler à cet appel" },
  signup_view_title: { en: "See full details", ko: "상세 정보 보기", ja: "詳細を見る", fr: "Voir tous les détails" },
  signup_chat_title: { en: "Message the gallery", ko: "갤러리에 메시지 보내기", ja: "ギャラリーにメッセージ", fr: "Contacter la galerie" },
  signup_general_title: { en: "Join the network", ko: "네트워크에 참여하기", ja: "ネットワークに参加", fr: "Rejoindre le réseau" },
  signup_apply_desc: { en: "Create an account to submit your portfolio and apply directly to galleries.", ko: "포트폴리오를 제출하고 갤러리에 직접 지원하려면 계정을 만드세요.", ja: "ポートフォリオを提出し、ギャラリーに直接応募するにはアカウントを作成してください。", fr: "Créez un compte pour soumettre votre portfolio et postuler directement aux galeries." },
  signup_2_minutes: { en: "Takes less than 2 minutes. No credit card required.", ko: "2분이면 완료. 신용카드 필요 없음.", ja: "2分で完了。クレジットカード不要。", fr: "Moins de 2 minutes. Aucune carte de crédit requise." },

  // ──────────────────────────────────────────
  // Shipping
  // ──────────────────────────────────────────
  ship_carrier: { en: "Carrier (DHL, FedEx...)", ko: "배송사 (DHL, FedEx...)", ja: "配送会社 (DHL, FedEx...)", fr: "Transporteur (DHL, FedEx...)" },
  ship_tracking: { en: "Tracking number", ko: "운송장 번호", ja: "追跡番号", fr: "Numéro de suivi" },
  ship_tracking_url: { en: "Tracking URL (optional)", ko: "추적 URL (선택)", ja: "追跡URL（任意）", fr: "URL de suivi (optionnel)" },
  ship_note: { en: "Shipping note", ko: "배송 메모", ja: "配送メモ", fr: "Note d'expédition" },

  // ──────────────────────────────────────────
  // Chat
  // ──────────────────────────────────────────
  chat_title: { en: "Chat", ko: "채팅", ja: "チャット", fr: "Chat" },
  chat_auto_translate: { en: "Auto-translate", ko: "자동 번역", ja: "自動翻訳", fr: "Traduction auto" },
  chat_type_message: { en: "Type a message...", ko: "메시지를 입력하세요...", ja: "メッセージを入力...", fr: "Tapez un message..." },
  chat_send: { en: "Send", ko: "전송", ja: "送信", fr: "Envoyer" },

  // ──────────────────────────────────────────
  // Community
  // ──────────────────────────────────────────
  nav_community: { en: "Community", ko: "커뮤니티", ja: "コミュニティ", fr: "Communauté" },
  community_badge: { en: "Artist Community", ko: "아티스트 커뮤니티", ja: "アーティストコミュニティ", fr: "Communauté d'Artistes" },
  community_title: { en: "Community", ko: "커뮤니티", ja: "コミュニティ", fr: "Communauté" },
  community_subtitle: { en: "Share ideas, get feedback, find collaborators, and connect with fellow artists worldwide.", ko: "아이디어를 공유하고, 피드백을 받고, 협업 파트너를 찾고, 전 세계 아티스트와 연결하세요.", ja: "アイデアを共有し、フィードバックを得て、コラボレーターを見つけ、世界中のアーティストとつながりましょう。", fr: "Partagez des idées, obtenez des retours, trouvez des collaborateurs et connectez-vous avec des artistes du monde entier." },
  community_write_prompt: { en: "Share something with the community...", ko: "커뮤니티에 글을 남겨보세요...", ja: "コミュニティに投稿してみましょう...", fr: "Partagez quelque chose avec la communauté..." },
  community_new_post: { en: "New Post", ko: "새 글 작성", ja: "新規投稿", fr: "Nouveau Post" },
  community_title_placeholder: { en: "Post title", ko: "제목을 입력하세요", ja: "タイトルを入力", fr: "Titre du post" },
  community_content_placeholder: { en: "Write your thoughts...", ko: "내용을 작성하세요...", ja: "内容を書いてください...", fr: "Écrivez vos pensées..." },
  community_publish: { en: "Publish", ko: "게시", ja: "投稿", fr: "Publier" },
  community_posting: { en: "Posting...", ko: "게시 중...", ja: "投稿中...", fr: "Publication..." },
  community_login_to_post: { en: "Sign in to share with the community", ko: "로그인하고 커뮤니티에 참여하세요", ja: "ログインしてコミュニティに参加", fr: "Connectez-vous pour partager" },
  community_login_to_comment: { en: "Sign in to leave a comment", ko: "로그인하고 댓글을 남겨보세요", ja: "ログインしてコメントする", fr: "Connectez-vous pour commenter" },
  community_no_posts: { en: "No posts yet. Be the first to share!", ko: "아직 글이 없습니다. 첫 글을 작성해보세요!", ja: "まだ投稿がありません。最初の投稿をしましょう！", fr: "Aucun post. Soyez le premier à partager !" },
  community_comments: { en: "comments", ko: "댓글", ja: "コメント", fr: "commentaires" },
  community_write_comment: { en: "Write a comment...", ko: "댓글을 작성하세요...", ja: "コメントを書く...", fr: "Écrire un commentaire..." },
  community_reply: { en: "Reply", ko: "답글", ja: "返信", fr: "Répondre" },
  community_pinned: { en: "Pinned", ko: "고정", ja: "固定", fr: "Épinglé" },
  community_cat_all: { en: "All", ko: "전체", ja: "すべて", fr: "Tout" },
  community_cat_find_collab: { en: "Find Collaborators", ko: "콜라보 작가 구하기", ja: "コラボ募集", fr: "Chercher Collaborateurs" },
  community_cat_art_chat: { en: "Art Talk & Daily", ko: "예술 수다 / 일상", ja: "アート＆日常", fr: "Art & Quotidien" },
  community_cat_meetup: { en: "Meetups", ko: "모임 만들기", ja: "集まり", fr: "Rencontres" },
  community_cat_find_exhibit: { en: "Exhibition Partners", ko: "같이 전시할 작가 찾기", ja: "展示パートナー募集", fr: "Partenaires d'exposition" },
  community_cat_general: { en: "General", ko: "자유", ja: "一般", fr: "Général" },
  community_cat_critique: { en: "Critique", ko: "크리틱", ja: "批評", fr: "Critique" },
  community_cat_collaboration: { en: "Collaboration", ko: "협업", ja: "コラボ", fr: "Collaboration" },
  community_cat_tips: { en: "Tips", ko: "팁", ja: "ヒント", fr: "Conseils" },
  community_cat_exhibition: { en: "Exhibition", ko: "전시", ja: "展覧会", fr: "Exposition" },
  community_cat_inspiration: { en: "Inspiration", ko: "영감", ja: "インスピ", fr: "Inspiration" },
  community_cat_daily: { en: "Daily Chat", ko: "일상 잡담", ja: "日常トーク", fr: "Bavardage" },
};

export function t(key: string, lang: string = "en"): string {
  return dictionary[key]?.[lang] || dictionary[key]?.["en"] || key;
}

// Get all available language codes
export function getAvailableLanguages(): { code: string; name: string }[] {
  return [
    { code: "en", name: "English" },
    { code: "ko", name: "한국어" },
    { code: "ja", name: "日本語" },
    { code: "fr", name: "Français" },
  ];
}
