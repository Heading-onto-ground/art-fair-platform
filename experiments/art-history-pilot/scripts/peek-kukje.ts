import { writeFileSync } from "node:fs";
import { fetchText } from "../src/http";
import { pilotPath } from "../src/paths";

async function main(): Promise<void> {
  const response = await fetchText("https://www.kukjegallery.com/artists", 20000);
  const index = response.text.toLowerCase().indexOf("lee ufan");
  const window = response.text.slice(Math.max(0, index - 800), index + 800);
  writeFileSync(pilotPath(".local-snapshots/kukje-lee-window.txt"), window, "utf8");
  console.log(index, response.text.length);
}

main();
