import { fetchText } from "../src/http";
import { writeJson } from "../src/io";
import { compactName } from "../src/resolve";

const indexes = [
  "https://www.kukjegallery.com/artists",
  "https://www.lehmannmaupin.com/artists",
  "https://www.pkmgallery.com/artists",
  "https://www.arariogallery.com/artists",
  "https://www.gallerybaton.com/artists",
  "https://www.galleryhyundai.com/en/artists",
  "https://www.galleryhyundai.com/artist",
];

const wanted = [
  "Lee Ufan",
  "Haegue Yang",
  "Do Ho Suh",
  "Lee Bul",
  "Kimsooja",
  "Anicka Yi",
  "Park Seo-Bo",
  "Ha Chong-Hyun",
  "Lee Bae",
  "Chung Sang-Hwa",
  "Kim Beom",
  "Minouk Lim",
  "Koo Jeong A",
  "Suki Seokyeong Kang",
  "Mire Lee",
  "Gimhongsok",
  "siren eun young jung",
  "Ayoung Kim",
  "Geumhyung Jeong",
  "Yeesookyung",
  "Kyungah Ham",
  "Im Heung-soon",
  "Park Chan-kyong",
  "Moon Kyungwon",
  "Nikki S. Lee",
];

function textOf(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ");
}

async function main(): Promise<void> {
  const hits: { index: string; status: number; name: string; url: string }[] = [];
  for (const index of indexes) {
    const response = await fetchText(index, 20000);
    console.log(index, response.status, response.text.length);
    if (response.status !== 200) continue;
    const plain = textOf(response.text);
    const hrefs = [...response.text.matchAll(/href=["']([^"'#]+)["']/g)].map((match) => {
      try {
        return new URL(match[1], index).toString();
      } catch {
        return "";
      }
    });
    for (const name of wanted) {
      if (!plain.toLowerCase().includes(name.toLowerCase()) && !plain.includes(compactName(name))) continue;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const url = hrefs.find((href) => href.toLowerCase().includes(slug) || href.toLowerCase().includes(name.toLowerCase().replace(/ /g, "%20")));
      hits.push({ index, status: response.status, name, url: url ?? "NAME_ON_PAGE_NO_HREF" });
    }
  }
  writeJson("data/manifest/artist-hrefs.json", { hits });
  console.log("hits", hits.length);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
