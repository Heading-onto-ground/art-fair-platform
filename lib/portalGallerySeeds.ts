export type PortalGallerySeed = {
  galleryId: string;
  name: string;
  country: string;
  city: string;
  website?: string;
  bio?: string;
  sourcePortal: string;
  sourceUrl?: string;
  externalEmail?: string;
};

// Initial directory seeds from major-portal style discovery.
// This list is intentionally explicit and easy to extend per country/city.
export const PORTAL_GALLERY_SEEDS: PortalGallerySeed[] = [
  // Korea
  {
    galleryId: "__ext_dir_kukje_seoul",
    name: "Kukje Gallery",
    country: "한국",
    city: "Seoul",
    website: "https://www.kukjegallery.com",
    bio: "Leading contemporary gallery in Seoul.",
    sourcePortal: "Naver",
    sourceUrl: "https://www.kukjegallery.com",
  },
  {
    galleryId: "__ext_dir_hyundai_seoul",
    name: "Gallery Hyundai",
    country: "한국",
    city: "Seoul",
    website: "https://www.galleryhyundai.com",
    bio: "Historic Korean gallery with international program.",
    sourcePortal: "Naver",
    sourceUrl: "https://www.galleryhyundai.com",
  },
  {
    galleryId: "__ext_dir_johyun_busan",
    name: "Johyun Gallery",
    country: "한국",
    city: "Busan",
    website: "https://www.johyungallery.com",
    bio: "Major gallery in Busan for Korean and global artists.",
    sourcePortal: "Naver",
    sourceUrl: "https://www.johyungallery.com",
  },

  // Japan
  {
    galleryId: "__ext_dir_taka_ishii_tokyo",
    name: "Taka Ishii Gallery",
    country: "일본",
    city: "Tokyo",
    website: "https://www.takaishiigallery.com",
    bio: "Contemporary art and photography program in Tokyo.",
    sourcePortal: "Yahoo Japan",
    sourceUrl: "https://www.takaishiigallery.com",
  },
  {
    galleryId: "__ext_dir_tomio_tokyo",
    name: "Tomio Koyama Gallery",
    country: "일본",
    city: "Tokyo",
    website: "https://www.tomiokoyamagallery.com",
    bio: "Tokyo-based contemporary gallery with global roster.",
    sourcePortal: "Yahoo Japan",
    sourceUrl: "https://www.tomiokoyamagallery.com",
  },

  // UK
  {
    galleryId: "__ext_dir_lisson_london",
    name: "Lisson Gallery",
    country: "영국",
    city: "London",
    website: "https://www.lissongallery.com",
    bio: "International contemporary gallery founded in London.",
    sourcePortal: "Google",
    sourceUrl: "https://www.lissongallery.com",
  },
  {
    galleryId: "__ext_dir_whitecube_london",
    name: "White Cube",
    country: "영국",
    city: "London",
    website: "https://www.whitecube.com",
    bio: "Major gallery for contemporary art in London.",
    sourcePortal: "Google",
    sourceUrl: "https://www.whitecube.com",
  },

  // France
  {
    galleryId: "__ext_dir_perrotin_paris",
    name: "Perrotin",
    country: "프랑스",
    city: "Paris",
    website: "https://www.perrotin.com",
    bio: "Global gallery with strong program in Paris.",
    sourcePortal: "Google",
    sourceUrl: "https://www.perrotin.com",
  },
  {
    galleryId: "__ext_dir_kamel_mennour_paris",
    name: "Kamel Mennour",
    country: "프랑스",
    city: "Paris",
    website: "https://www.kamelmennour.com",
    bio: "Prominent Paris gallery with international artists.",
    sourcePortal: "Google",
    sourceUrl: "https://www.kamelmennour.com",
  },

  // USA
  {
    galleryId: "__ext_dir_gagosian_ny",
    name: "Gagosian",
    country: "미국",
    city: "New York",
    website: "https://gagosian.com",
    bio: "Large global gallery network.",
    sourcePortal: "Google",
    sourceUrl: "https://gagosian.com",
  },
  {
    galleryId: "__ext_dir_davidzwirner_ny",
    name: "David Zwirner",
    country: "미국",
    city: "New York",
    website: "https://www.davidzwirner.com",
    bio: "Influential contemporary gallery in New York.",
    sourcePortal: "Google",
    sourceUrl: "https://www.davidzwirner.com",
  },
  {
    galleryId: "__ext_dir_blumpoe_la",
    name: "Blum & Poe",
    country: "미국",
    city: "Los Angeles",
    website: "https://www.blumandpoe.com",
    bio: "Contemporary gallery in Los Angeles.",
    sourcePortal: "Google",
    sourceUrl: "https://www.blumandpoe.com",
  },

  // Germany
  {
    galleryId: "__ext_dir_sprueth_berlin",
    name: "Sprüth Magers",
    country: "독일",
    city: "Berlin",
    website: "https://www.spruethmagers.com",
    bio: "Leading contemporary gallery with Berlin base.",
    sourcePortal: "Google",
    sourceUrl: "https://www.spruethmagers.com",
  },
  {
    galleryId: "__ext_dir_koenig_berlin",
    name: "König Galerie",
    country: "독일",
    city: "Berlin",
    website: "https://www.koeniggalerie.com",
    bio: "Contemporary gallery in Berlin.",
    sourcePortal: "Google",
    sourceUrl: "https://www.koeniggalerie.com",
  },

  // Italy
  {
    galleryId: "__ext_dir_massimo_milan",
    name: "Massimo De Carlo",
    country: "이탈리아",
    city: "Milan",
    website: "https://www.massimodecarlo.com",
    bio: "Major contemporary gallery in Milan.",
    sourcePortal: "Google",
    sourceUrl: "https://www.massimodecarlo.com",
  },
  {
    galleryId: "__ext_dir_continua_sg",
    name: "Galleria Continua",
    country: "이탈리아",
    city: "San Gimignano",
    website: "https://www.galleriacontinua.com",
    bio: "International gallery network founded in Italy.",
    sourcePortal: "Google",
    sourceUrl: "https://www.galleriacontinua.com",
  },

  // China
  {
    galleryId: "__ext_dir_shanghart_shanghai",
    name: "ShanghART Gallery",
    country: "중국",
    city: "Shanghai",
    website: "https://www.shanghartgallery.com",
    bio: "One of the earliest contemporary galleries in China.",
    sourcePortal: "Baidu",
    sourceUrl: "https://www.shanghartgallery.com",
  },
  {
    galleryId: "__ext_dir_longmarch_beijing",
    name: "Long March Space",
    country: "중국",
    city: "Beijing",
    website: "https://www.longmarchspace.com",
    bio: "Contemporary gallery and project space in Beijing.",
    sourcePortal: "Baidu",
    sourceUrl: "https://www.longmarchspace.com",
  },

  // Switzerland
  {
    galleryId: "__ext_dir_presenhuber_zurich",
    name: "Galerie Eva Presenhuber",
    country: "스위스",
    city: "Zurich",
    website: "https://www.presenhuber.com",
    bio: "Leading Swiss gallery in Zurich.",
    sourcePortal: "Google",
    sourceUrl: "https://www.presenhuber.com",
  },

  // Australia
  {
    galleryId: "__ext_dir_roslyn_sydney",
    name: "Roslyn Oxley9 Gallery",
    country: "호주",
    city: "Sydney",
    website: "https://www.roslynoxley9.com.au",
    bio: "Prominent Sydney contemporary gallery.",
    sourcePortal: "Google",
    sourceUrl: "https://www.roslynoxley9.com.au",
  },
  {
    galleryId: "__ext_dir_anna_melbourne",
    name: "Anna Schwartz Gallery",
    country: "호주",
    city: "Melbourne",
    website: "https://www.annaschwartzgallery.com",
    bio: "Contemporary gallery in Melbourne.",
    sourcePortal: "Google",
    sourceUrl: "https://www.annaschwartzgallery.com",
  },
];

