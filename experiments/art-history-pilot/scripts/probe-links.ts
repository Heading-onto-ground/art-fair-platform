import { fetchText } from "../src/http";
import { writeJson } from "../src/io";

const seeds = [
  "https://www.kukjegallery.com/artists",
  "https://www.lehmannmaupin.com/artists",
  "https://www.galleryhyundai.com/artists",
  "https://www.pkmgallery.com/artists",
  "https://www.moma.org/artists/37934",
];

function links(html: string, base: string): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/g)) {
    try {
      const url = new URL(match[1], base).toString();
      if (/artist|exhibition/i.test(url)) found.add(url.split("?")[0]);
    } catch {
      continue;
    }
  }
  return [...found].slice(0, 40);
}

async function main(): Promise<void> {
  const rows = [];
  for (const url of seeds) {
    const response = await fetchText(url, 20000);
    rows.push({
      url,
      status: response.status,
      bytes: response.text.length,
      links: response.status === 200 ? links(response.text, url) : [],
    });
    console.log(url, response.status, response.text.length);
  }
  writeJson("data/manifest/link-probe.json", { rows });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
