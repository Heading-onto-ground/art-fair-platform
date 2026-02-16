import type { RawDirectoryGallery } from "@/lib/galleryDirectoryQuality";

// Multi-portal seed catalog. Intentionally includes partial overlaps
// so the sync job can validate dedupe/merge quality.
export const PORTAL_GALLERY_SOURCES: RawDirectoryGallery[] = [
  // Korea - Naver
  { name: "Kukje Gallery", country: "한국", city: "Seoul", website: "https://www.kukjegallery.com", sourcePortal: "Naver", sourceUrl: "https://search.naver.com/search.naver?query=Kukje+Gallery", bio: "Leading contemporary gallery in Seoul." },
  { name: "Gallery Hyundai", country: "한국", city: "Seoul", website: "https://www.galleryhyundai.com", sourcePortal: "Naver", sourceUrl: "https://search.naver.com/search.naver?query=Gallery+Hyundai" },
  { name: "PKM Gallery", country: "한국", city: "Seoul", website: "https://www.pkmgallery.com", sourcePortal: "Naver" },
  { name: "Johyun Gallery", country: "한국", city: "Busan", website: "https://www.johyungallery.com", sourcePortal: "Naver" },
  { name: "Gallery BHAK", country: "한국", city: "Seoul", website: "https://www.gallerybhak.com", sourcePortal: "Naver" },

  // Japan - Yahoo Japan
  { name: "Taka Ishii Gallery", country: "일본", city: "Tokyo", website: "https://www.takaishiigallery.com", sourcePortal: "Yahoo Japan" },
  { name: "Tomio Koyama Gallery", country: "일본", city: "Tokyo", website: "https://www.tomiokoyamagallery.com", sourcePortal: "Yahoo Japan" },
  { name: "SCAI THE BATHHOUSE", country: "일본", city: "Tokyo", website: "https://www.scaithebathhouse.com", sourcePortal: "Yahoo Japan" },
  { name: "imura art gallery", country: "일본", city: "Kyoto", website: "https://www.imuraart.com", sourcePortal: "Yahoo Japan" },

  // UK - Google
  { name: "Lisson Gallery", country: "영국", city: "London", website: "https://www.lissongallery.com", sourcePortal: "Google" },
  { name: "White Cube", country: "영국", city: "London", website: "https://www.whitecube.com", sourcePortal: "Google" },
  { name: "Victoria Miro", country: "영국", city: "London", website: "https://www.victoria-miro.com", sourcePortal: "Google" },
  { name: "Hauser & Wirth", country: "영국", city: "London", website: "https://www.hauserwirth.com", sourcePortal: "Google" },

  // France - Google
  { name: "Perrotin", country: "프랑스", city: "Paris", website: "https://www.perrotin.com", sourcePortal: "Google" },
  { name: "Galerie Kamel Mennour", country: "프랑스", city: "Paris", website: "https://www.kamelmennour.com", sourcePortal: "Google" },
  { name: "Galerie Lelong & Co.", country: "프랑스", city: "Paris", website: "https://www.galerie-lelong.com", sourcePortal: "Google" },

  // USA - Google
  { name: "Gagosian", country: "미국", city: "New York", website: "https://gagosian.com", sourcePortal: "Google" },
  { name: "David Zwirner", country: "미국", city: "New York", website: "https://www.davidzwirner.com", sourcePortal: "Google" },
  { name: "Pace Gallery", country: "미국", city: "New York", website: "https://www.pacegallery.com", sourcePortal: "Google" },
  { name: "Blum & Poe", country: "미국", city: "Los Angeles", website: "https://www.blumandpoe.com", sourcePortal: "Google" },
  { name: "The Box", country: "미국", city: "Los Angeles", website: "https://www.theboxla.com", sourcePortal: "Google" },

  // Germany - Google
  { name: "Sprüth Magers", country: "독일", city: "Berlin", website: "https://www.spruethmagers.com", sourcePortal: "Google" },
  { name: "Konig Galerie", country: "독일", city: "Berlin", website: "https://www.koeniggalerie.com", sourcePortal: "Google" },
  { name: "neugerriemschneider", country: "독일", city: "Berlin", website: "https://www.neugerriemschneider.com", sourcePortal: "Google" },

  // Italy - Google
  { name: "Massimo De Carlo", country: "이탈리아", city: "Milan", website: "https://www.massimodecarlo.com", sourcePortal: "Google" },
  { name: "Galleria Continua", country: "이탈리아", city: "San Gimignano", website: "https://www.galleriacontinua.com", sourcePortal: "Google" },

  // China - Baidu
  { name: "ShanghART Gallery", country: "중국", city: "Shanghai", website: "https://www.shanghartgallery.com", sourcePortal: "Baidu" },
  { name: "Long March Space", country: "중국", city: "Beijing", website: "https://www.longmarchspace.com", sourcePortal: "Baidu" },
  { name: "Tang Contemporary Art", country: "중국", city: "Beijing", website: "https://www.tangcontemporary.com", sourcePortal: "Baidu" },

  // Switzerland / Australia
  { name: "Galerie Eva Presenhuber", country: "스위스", city: "Zurich", website: "https://www.presenhuber.com", sourcePortal: "Google" },
  { name: "Roslyn Oxley9 Gallery", country: "호주", city: "Sydney", website: "https://www.roslynoxley9.com.au", sourcePortal: "Google" },
  { name: "Anna Schwartz Gallery", country: "호주", city: "Melbourne", website: "https://www.annaschwartzgallery.com", sourcePortal: "Google" },

  // Deliberate overlaps across naming variants (for dedupe validation)
  { name: "Kukje", country: "한국", city: "Seoul", website: "https://kukjegallery.com", sourcePortal: "Google" },
  { name: "Gallery Hyundai Seoul", country: "한국", city: "Seoul", website: "https://galleryhyundai.com", sourcePortal: "Google" },
  { name: "Konig Galerie", country: "독일", city: "Berlin", website: "https://koeniggalerie.com", sourcePortal: "Bing" },
];

