import { writeFileSync } from "fs";
import { isRecordedExhibition, type ExhibitionRecord } from "../src/claims";
import { readJson } from "../src/io";
import { pilotPath } from "../src/paths";
import { sameCanonicalExhibition } from "../src/product";

type FileShape = {
  phase: string;
  usageStatus: string;
  productionClearance: string;
  records: ExhibitionRecord[];
};

const file = readJson<FileShape>("data/claims/exhibitions.json");
const kept: ExhibitionRecord[] = [];
let merged = 0;
for (const record of file.records) {
  const prior = kept.find((item) => sameCanonicalExhibition(item, record));
  if (!prior || !isRecordedExhibition(record)) {
    kept.push(record);
    continue;
  }
  const sources = new Set([prior.sourceUrl, ...(prior.additionalSources ?? [])]);
  if (!sources.has(record.sourceUrl)) prior.additionalSources = [...sources, record.sourceUrl].filter((url) => url !== prior.sourceUrl);
  merged += 1;
}
writeFileSync(
  pilotPath("data/claims/exhibitions.json"),
  JSON.stringify({ ...file, exactCanonicalMerges: merged, records: kept }, null, 2),
  "utf8",
);
console.log(JSON.stringify({ before: file.records.length, after: kept.length, merged }));
