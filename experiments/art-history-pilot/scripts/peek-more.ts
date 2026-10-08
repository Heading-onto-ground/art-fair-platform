import { writeFileSync } from "node:fs";
import { fetchText } from "../src/http";
import { plainPage } from "../src/cvList";
import { pilotPath } from "../src/paths";

const pages = [
  ["leebul", "https://www.lehmannmaupin.com/artists/lee-bul/exhibitions"],
];

async function main(): Promise<void> {
  for (const [name, url] of pages) {
    const response = await fetchText(url, 25000);
    const text = plainPage(response.text);
    writeFileSync(pilotPath(`.local-snapshots/peek-${name}.txt`), text.slice(0, 9000), "utf8");
    console.log(name, response.status, text.length);
  }
}

main();
