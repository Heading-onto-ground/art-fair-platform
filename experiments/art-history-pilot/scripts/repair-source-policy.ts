import { fetchText } from "../src/http";
import { writeJson, readJson } from "../src/io";
import { robotsAllows } from "../src/robots";
import { classifySource, type SourceSignals } from "../src/sourcePolicy";

type Review = {
  host: string;
  tier: number;
  category: string;
  reviewedAt: string;
  robotsAllowTarget: boolean;
  robotsStatus: number | null;
  targetPath: string;
  documentsFetched: string[];
  matchedSentence: string | null;
  reason: string;
};

type MatrixRow = {
  domain: string;
  source_name: string;
  robots_access: string;
  official_api_or_dataset: string;
  content_license: string;
  structured_data_license: string;
  terms_restriction: string;
  commercial_reuse_status: string;
  database_rights_note: string;
  automation_status: string;
  reuse_status: string;
  final_pilot_status: "GREEN" | "YELLOW" | "RED";
  reason: string;
  checked_at: string;
  evidence_url: string;
};

const DATABASE_NOTE =
  "Not a legal opinion. A robots rule is not a copyright license, and an Allow rule is not reuse permission. Korean law can protect a database maker against repeated systematic extraction; commercial use of YELLOW sources stays deferred.";

function row(
  checkedAt: string,
  fields: Omit<MatrixRow, "database_rights_note" | "automation_status" | "reuse_status" | "final_pilot_status" | "reason">,
  signals: SourceSignals,
): MatrixRow {
  const classified = classifySource(signals);
  return {
    ...fields,
    database_rights_note: DATABASE_NOTE,
    automation_status: classified.automationStatus,
    reuse_status: classified.reuseStatus,
    final_pilot_status: classified.finalPilotStatus,
    reason: classified.reason,
    checked_at: checkedAt,
  };
}

async function fromReview(review: Review, checkedAt: string): Promise<MatrixRow> {
  const explicit = review.reason === "explicit_permission_required";
  const perItem = review.reason === "open_license_is_per_item_not_sitewide";
  let robotsAccess: SourceSignals["robotsAccess"] =
    review.robotsStatus === 200 ? (review.robotsAllowTarget ? "ALLOWED" : "DISALLOWED") : "UNREADABLE";
  if (review.robotsStatus !== 200) {
    const live = await fetchText(`https://${review.host}/robots.txt`, 20000).catch(() => null);
    if (live?.status === 200) {
      robotsAccess = robotsAllows(live.text, review.targetPath || "/") ? "ALLOWED" : "DISALLOWED";
    }
  }
  const signals: SourceSignals = {
    robotsAccess,
    officialInterface: "NONE",
    structuredDataLicense: explicit ? "INCOMPATIBLE" : perItem ? "PER_ITEM" : "UNSPECIFIED",
    explicitReuseBan: explicit,
    accessBarrier: "NONE",
  };
  return row(
    checkedAt,
    {
      domain: review.host,
      source_name: review.host,
      robots_access: robotsAccess,
      official_api_or_dataset: "NONE",
      content_license: explicit ? "INCOMPATIBLE" : perItem ? "PER_ITEM_KOGL" : "UNSPECIFIED",
      structured_data_license: signals.structuredDataLicense,
      terms_restriction: explicit ? "EXPLICIT_BAN" : perItem ? "PER_ITEM" : "UNCLEAR",
      commercial_reuse_status: explicit ? "INCOMPATIBLE" : perItem ? "PER_ITEM" : "UNSPECIFIED",
      checked_at: checkedAt,
      evidence_url: review.documentsFetched.at(-1) ?? `https://${review.host}/robots.txt`,
    },
    signals,
  );
}

async function dataGoKrLicense(url: string): Promise<boolean> {
  const response = await fetchText(url, 25000);
  if (response.status !== 200) return false;
  return response.text.includes("이용허락범위 제한 없음");
}

async function main(): Promise<void> {
  const checkedAt = new Date().toISOString();
  const reviews = readJson<{ reviews: Review[] }>("data/policy/domain-reviews.json").reviews;
  const rows: MatrixRow[] = [];

  rows.push(
    row(
      checkedAt,
      {
        domain: "www.wikidata.org",
        source_name: "Wikidata Action API /w/api.php",
        robots_access: "DISALLOWED",
        official_api_or_dataset: "OFFICIAL_BUT_ROBOTS_DISALLOW",
        content_license: "CC_BY_SA_FOR_UNSTRUCTURED_TEXT",
        structured_data_license: "CC0",
        terms_restriction: "NONE_ON_STRUCTURED_DATA",
        commercial_reuse_status: "CC0",
        checked_at: checkedAt,
        evidence_url: "https://www.wikidata.org/robots.txt",
      },
      {
        robotsAccess: "DISALLOWED",
        officialInterface: "DISALLOWED",
        structuredDataLicense: "CC0",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      },
    ),
  );

  rows.push(
    row(
      checkedAt,
      {
        domain: "query.wikidata.org",
        source_name: "Wikidata Query Service /sparql",
        robots_access: "DISALLOWED",
        official_api_or_dataset: "OFFICIAL_BUT_ROBOTS_DISALLOW",
        content_license: "CC0",
        structured_data_license: "CC0",
        terms_restriction: "NONE_ON_STRUCTURED_DATA",
        commercial_reuse_status: "CC0",
        checked_at: checkedAt,
        evidence_url: "https://query.wikidata.org/robots.txt",
      },
      {
        robotsAccess: "DISALLOWED",
        officialInterface: "DISALLOWED",
        structuredDataLicense: "CC0",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      },
    ),
  );

  rows.push(
    row(
      checkedAt,
      {
        domain: "www.wikidata.org",
        source_name: "Wikidata Special:EntityData",
        robots_access: "ALLOWED",
        official_api_or_dataset: "SPECIAL_ENTITYDATA_JSON",
        content_license: "CC_BY_SA_FOR_UNSTRUCTURED_TEXT",
        structured_data_license: "CC0",
        terms_restriction: "NONE_ON_STRUCTURED_DATA",
        commercial_reuse_status: "CC0",
        checked_at: checkedAt,
        evidence_url: "https://www.wikidata.org/wiki/Wikidata:Licensing",
      },
      {
        robotsAccess: "ALLOWED",
        officialInterface: "OPEN",
        structuredDataLicense: "CC0",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      },
    ),
  );

  for (const review of reviews) {
    if (review.host === "www.wikidata.org") continue;
    rows.push(await fromReview(review, checkedAt));
  }

  const openApiUrl = "https://www.data.go.kr/data/15058313/openapi.do";
  const fileUrl = "https://www.data.go.kr/data/15137158/fileData.do";
  const openApiOpen = await dataGoKrLicense(openApiUrl);
  const fileOpen = await dataGoKrLicense(fileUrl);
  rows.push(
    row(
      checkedAt,
      {
        domain: "www.data.go.kr",
        source_name: "문화체육관광부_전시정보(국립현대미술관) OpenAPI 15058313",
        robots_access: "ALLOWED",
        official_api_or_dataset: openApiOpen ? "OFFICIAL_OPEN_API_KEY_REQUIRED" : "CATALOG_PAGE_ONLY",
        content_license: openApiOpen ? "USE_SCOPE_UNRESTRICTED" : "UNSPECIFIED",
        structured_data_license: openApiOpen ? "EXPLICIT_OPEN" : "UNSPECIFIED",
        terms_restriction: openApiOpen ? "NONE_STATED_ON_CATALOG" : "UNCLEAR",
        commercial_reuse_status: openApiOpen ? "STATED_NO_SCOPE_RESTRICTION" : "UNSPECIFIED",
        checked_at: checkedAt,
        evidence_url: openApiUrl,
      },
      {
        robotsAccess: "ALLOWED",
        officialInterface: openApiOpen ? "OPEN_KEY_REQUIRED" : "NONE",
        structuredDataLicense: openApiOpen ? "EXPLICIT_OPEN" : "UNSPECIFIED",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      },
    ),
  );
  rows.push(
    row(
      checkedAt,
      {
        domain: "www.data.go.kr",
        source_name: "국립현대미술관_전시프로그램 정보 file 15137158",
        robots_access: "ALLOWED",
        official_api_or_dataset: fileOpen ? "OFFICIAL_FILE_DATASET" : "CATALOG_PAGE_ONLY",
        content_license: fileOpen ? "USE_SCOPE_UNRESTRICTED" : "UNSPECIFIED",
        structured_data_license: fileOpen ? "EXPLICIT_OPEN" : "UNSPECIFIED",
        terms_restriction: fileOpen ? "NONE_STATED_ON_CATALOG" : "UNCLEAR",
        commercial_reuse_status: fileOpen ? "STATED_NO_SCOPE_RESTRICTION" : "UNSPECIFIED",
        checked_at: checkedAt,
        evidence_url: fileUrl,
      },
      {
        robotsAccess: "ALLOWED",
        officialInterface: fileOpen ? "OPEN_KEY_REQUIRED" : "NONE",
        structuredDataLicense: fileOpen ? "EXPLICIT_OPEN" : "UNSPECIFIED",
        explicitReuseBan: false,
        accessBarrier: "NONE",
      },
    ),
  );

  const counts = { GREEN: 0, YELLOW: 0, RED: 0 };
  for (const item of rows) counts[item.final_pilot_status] += 1;
  writeJson("data/policy/source-policy-matrix.json", {
    phase: "P1-S",
    checkedAt,
    exhibitionRecordsCreated: 0,
    counts,
    rows,
  });
  console.log(JSON.stringify(counts));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
