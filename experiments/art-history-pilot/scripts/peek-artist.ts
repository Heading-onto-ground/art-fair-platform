import { writeFileSync } from "node:fs";
import { fetchText } from "../src/http";
import { pilotPath } from "../src/paths";

function plain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h1|h2|h3|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ");
}

async function main(): Promise<void> {
  const response = await fetchText("https://www.kukjegallery.com/artists/view?seq=190", 20000);
  const text = plain(response.text);
  writeFileSync(pilotPath(".local-snapshots/kukje-lee-ufan.txt"), text.slice(0, 12000), "utf8");
  console.log(response.status, text.length);
}

main();
