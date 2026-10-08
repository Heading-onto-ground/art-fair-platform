import { fetchText } from "../src/http";
import { writeJson } from "../src/io";
import { decideReuse, type SourceTier } from "../src/policy";
import { crawlDelaySeconds, robotsAllows } from "../src/robots";

type DomainCandidate = {
  host: string;
  tier: SourceTier;
  targetPath: string;
  category: string;
  extraUrls?: string[];
};

const DOMAINS: DomainCandidate[] = [
  { host: "www.wikidata.org", tier: 0, targetPath: "/w/api.php", category: "identity", extraUrls: ["https://www.wikidata.org/wiki/Wikidata:Licensing"] },
  { host: "www.mmca.go.kr", tier: 1, targetPath: "/", category: "museum" },
  { host: "koreaartistprize.org", tier: 1, targetPath: "/", category: "award" },
  { host: "sema.seoul.go.kr", tier: 1, targetPath: "/", category: "museum" },
  { host: "www.gwangjubiennale.org", tier: 1, targetPath: "/", category: "biennale" },
  { host: "www.busanbiennale.org", tier: 1, targetPath: "/", category: "biennale" },
  { host: "mediacityseoul.kr", tier: 1, targetPath: "/", category: "biennale", extraUrls: ["https://www.mediacityseoul.kr/en/smb"] },
  { host: "songeun.or.kr", tier: 1, targetPath: "/", category: "award" },
  { host: "www.kukjegallery.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.galleryhyundai.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.pkmgallery.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.arariogallery.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.gallerybaton.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.hakgojae.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.pacegallery.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.lehmannmaupin.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.victoria-miro.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.hauserwirth.com", tier: 1, targetPath: "/", category: "gallery" },
  { host: "www.tate.org.uk", tier: 1, targetPath: "/", category: "museum" },
  { host: "www.moma.org", tier: 1, targetPath: "/", category: "museum" },
  { host: "www.guggenheim.org", tier: 1, targetPath: "/", category: "museum" },
  { host: "www.diaart.org", tier: 1, targetPath: "/", category: "museum" },
  { host: "www.southbankcentre.co.uk", tier: 1, targetPath: "/", category: "museum" },
  { host: "www.labiennale.org", tier: 1, targetPath: "/", category: "biennale" },
  { host: "whitney.org", tier: 1, targetPath: "/", category: "museum" },
  { host: "www.e-flux.com", tier: 2, targetPath: "/", category: "corroboration" },
];

function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 80000);
}

function sentenceAround(text: string, phrase: string): string | null {
  const index = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (index < 0) return null;
  return text.slice(Math.max(0, index - 80), index + phrase.length + 80).replace(/\s+/g, " ").slice(0, 200);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const reviews = [];
  for (const domain of DOMAINS) {
    const origin = `https://${domain.host}`;
    let robotsStatus: number | null = null;
    let robotsAllow = false;
    let crawlDelay: number | null = null;
    let robotsError: string | null = null;
    try {
      const robots = await fetchText(`${origin}/robots.txt`, 12000);
      robotsStatus = robots.status;
      if (robots.status === 200) {
        robotsAllow = robotsAllows(robots.text, domain.targetPath);
        crawlDelay = crawlDelaySeconds(robots.text);
      } else if (robots.status === 404) {
        robotsAllow = true;
      }
    } catch (error) {
      robotsError = String(error);
    }
    await sleep(250);

    const texts: string[] = [];
    const fetched: string[] = [];
    try {
      const home = await fetchText(origin, 12000);
      fetched.push(origin);
      if (home.status === 200) texts.push(strip(home.text));
      const links = [...(home.text.match(/href=["']([^"']+)["']/gi) ?? [])]
        .map((item) => item.slice(item.indexOf("=") + 1).replace(/["']/g, ""))
        .filter((href) => /terms|privacy|copyright|legal|licensing|이용약관|저작권/i.test(href))
        .slice(0, 2);
      for (const href of links) {
        const url = new URL(href, origin).toString();
        const page = await fetchText(url, 12000);
        fetched.push(url);
        if (page.status === 200) texts.push(strip(page.text));
        await sleep(250);
      }
    } catch (error) {
      robotsError = robotsError ?? String(error);
    }
    for (const extra of domain.extraUrls ?? []) {
      try {
        const page = await fetchText(extra, 12000);
        fetched.push(extra);
        if (page.status === 200) texts.push(strip(page.text));
      } catch (error) {
        robotsError = robotsError ?? String(error);
      }
      await sleep(250);
    }

    const combined = texts.join("\n");
    const decision = decideReuse({
      tier: domain.tier,
      robotsAllowTarget: robotsAllow,
      termsText: combined || null,
    });
    const matched =
      sentenceAround(combined, "cc0") ||
      sentenceAround(combined, "without prior permission") ||
      sentenceAround(combined, "무단") ||
      sentenceAround(combined, "public domain");
    reviews.push({
      host: domain.host,
      tier: domain.tier,
      category: domain.category,
      reviewedAt: new Date().toISOString(),
      robotsStatus,
      robotsAllowTarget: robotsAllow,
      targetPath: domain.targetPath,
      crawlDelay,
      robotsError,
      documentsFetched: fetched,
      matchedSentence: matched,
      ...decision,
    });
    console.log(`${domain.host} ${decision.mode} ${decision.reason}`);
  }
  writeJson("data/policy/domain-reviews.json", { reviews });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
