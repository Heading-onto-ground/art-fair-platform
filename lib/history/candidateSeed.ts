export type PilotExhibition = {
  id: string;
  title: string;
  status: string;
  venueName: string | null;
  artistNames: string[];
  sourceUrl?: string | null;
  evidences?: { sourceUrl?: string | null }[];
};

export type PilotArtist = {
  pilotId: string;
  canonicalKoreanName: string;
  romanizedNames: string[];
  otherAliases?: string[];
};

export type LaunchCandidate = {
  pilotId: string;
  artistName: string;
  romanizedName: string | null;
  pilotAcceptedExhibitionCount: number;
  launchExhibitionCount: number;
  launchExhibitionIds: string[];
  sourceFamilies: string[];
  sourceUrlCount: number;
  sharedExhibitionIds: string[];
  spaces: string[];
  warnings: string[];
  productionClearanceStatus: "NOT_REVIEWED";
};

export type LaunchSource = {
  sourceUrl: string;
  sourceFamily: string;
  sourceType: "webpage";
  accessStatus: "retrieved-during-pilot";
  licenseEvidence: null;
  termsReview: "REVIEW_REQUIRED";
  recordScope: string[];
  decision: "NOT_REVIEWED";
  notes: string;
};

export type LaunchSeed = {
  status: "NOT_REVIEWED";
  reason: string;
  bridgeExhibitionIds: string[];
  artists: LaunchCandidate[];
  sources: LaunchSource[];
};

function norm(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
}

function aliases(artist: PilotArtist): string[] {
  return [artist.canonicalKoreanName, ...artist.romanizedNames, ...(artist.otherAliases ?? [])].map(norm).filter(Boolean);
}

function urlsOf(record: PilotExhibition): string[] {
  const urls = [record.sourceUrl, ...(record.evidences ?? []).map((item) => item.sourceUrl)];
  return [...new Set(urls.filter((url): url is string => Boolean(url && url.trim())).map((url) => url.trim()))];
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unparsed-host";
  }
}

function matchedArtists(record: PilotExhibition, artists: PilotArtist[]): PilotArtist[] {
  const labels = new Set(record.artistNames.map(norm));
  return artists.filter((artist) => aliases(artist).some((alias) => labels.has(alias)));
}

export function selectLaunchSeed(artists: PilotArtist[], records: PilotExhibition[]): LaunchSeed {
  const accepted = records.filter((record) => record.status === "PILOT_ACCEPTED");
  const byArtist = new Map<string, PilotExhibition[]>();
  const recordArtists = new Map<string, PilotArtist[]>();
  for (const record of accepted) {
    const hits = matchedArtists(record, artists);
    recordArtists.set(record.id, hits);
    for (const artist of hits) {
      const list = byArtist.get(artist.pilotId) ?? [];
      list.push(record);
      byArtist.set(artist.pilotId, list);
    }
  }
  const ranked = artists
    .map((artist) => ({ artist, records: byArtist.get(artist.pilotId) ?? [] }))
    .filter((item) => item.records.length > 0)
    .sort((a, b) => b.records.length - a.records.length || a.artist.pilotId.localeCompare(b.artist.pilotId));

  let best: { left: string; right: string; exhibitionId: string; score: number } | null = null;
  for (const record of accepted) {
    const hits = recordArtists.get(record.id) ?? [];
    if (hits.length < 2) continue;
    for (let i = 0; i < hits.length; i += 1) {
      for (let j = i + 1; j < hits.length; j += 1) {
        const leftCount = byArtist.get(hits[i].pilotId)?.length ?? 0;
        const rightCount = byArtist.get(hits[j].pilotId)?.length ?? 0;
        const score = Math.min(leftCount, rightCount) * 1000 + leftCount + rightCount;
        if (!best || score > best.score) {
          best = { left: hits[i].pilotId, right: hits[j].pilotId, exhibitionId: record.id, score };
        }
      }
    }
  }

  const selectedIds: string[] = [];
  if (best) selectedIds.push(best.left, best.right);
  else if (ranked[0]) selectedIds.push(ranked[0].artist.pilotId);

  while (selectedIds.length < 4) {
    const next = ranked.find((item) => {
      if (selectedIds.includes(item.artist.pilotId)) return false;
      return item.records.some((record) => (recordArtists.get(record.id) ?? []).some((artist) => selectedIds.includes(artist.pilotId)));
    });
    if (!next) break;
    selectedIds.push(next.artist.pilotId);
  }

  const selected = selectedIds
    .map((id) => ranked.find((item) => item.artist.pilotId === id))
    .filter((item): item is (typeof ranked)[number] => Boolean(item));
  const lead = [...selected].sort((a, b) => b.records.length - a.records.length)[0];
  const chosen = new Set<string>();
  if (best) chosen.add(best.exhibitionId);
  if (lead) {
    const extras = lead.records
      .filter((record) => !chosen.has(record.id))
      .sort((a, b) => Number(Boolean(b.venueName)) - Number(Boolean(a.venueName)));
    for (const record of extras) {
      const leadCount = [...chosen].filter((id) => (recordArtists.get(id) ?? []).some((artist) => artist.pilotId === lead.artist.pilotId)).length;
      if (leadCount >= 8) break;
      chosen.add(record.id);
    }
  }
  for (const item of selected) {
    if ([...chosen].some((id) => (recordArtists.get(id) ?? []).some((artist) => artist.pilotId === item.artist.pilotId))) continue;
    const shared = item.records.find((record) => (recordArtists.get(record.id) ?? []).some((artist) => selectedIds.includes(artist.pilotId) && artist.pilotId !== item.artist.pilotId));
    if (shared) chosen.add(shared.id);
  }

  const chosenRecords = accepted.filter((record) => chosen.has(record.id));
  const launchArtists: LaunchCandidate[] = selected.map((item) => {
    const mine = chosenRecords.filter((record) => (recordArtists.get(record.id) ?? []).some((artist) => artist.pilotId === item.artist.pilotId));
    const shared = mine.filter((record) => (recordArtists.get(record.id) ?? []).filter((artist) => selectedIds.includes(artist.pilotId)).length > 1);
    const families = [...new Set(mine.flatMap((record) => urlsOf(record).map(hostOf)))].sort();
    const warnings: string[] = [];
    if (item.records.length > mine.length) warnings.push(`Pilot history has ${item.records.length} accepted exhibitions. The launch subset has ${mine.length}.`);
    if (mine.some((record) => !record.venueName)) warnings.push("A launch exhibition has no venue.");
    if (mine.some((record) => /G1995/i.test(`${record.title} ${record.venueName ?? ""}`))) warnings.push("A launch exhibition still contains the unresolved G1995 venue text.");
    return {
      pilotId: item.artist.pilotId,
      artistName: item.artist.canonicalKoreanName,
      romanizedName: item.artist.romanizedNames[0] ?? null,
      pilotAcceptedExhibitionCount: item.records.length,
      launchExhibitionCount: mine.length,
      launchExhibitionIds: mine.map((record) => record.id),
      sourceFamilies: families,
      sourceUrlCount: new Set(mine.flatMap(urlsOf)).size,
      sharedExhibitionIds: shared.map((record) => record.id),
      spaces: [...new Set(mine.map((record) => record.venueName).filter((venue): venue is string => Boolean(venue)))].sort(),
      warnings,
      productionClearanceStatus: "NOT_REVIEWED",
    };
  });

  const sourceMap = new Map<string, LaunchSource>();
  for (const record of chosenRecords) {
    for (const url of urlsOf(record)) {
      const current = sourceMap.get(url) ?? {
        sourceUrl: url,
        sourceFamily: hostOf(url),
        sourceType: "webpage" as const,
        accessStatus: "retrieved-during-pilot" as const,
        licenseEvidence: null,
        termsReview: "REVIEW_REQUIRED" as const,
        recordScope: [],
        decision: "NOT_REVIEWED" as const,
        notes: "Reuse is not decided. A public page and robots.txt are not a license, and a missing open-data license is not a rejection.",
      };
      if (!current.recordScope.includes(record.id)) current.recordScope.push(record.id);
      sourceMap.set(url, current);
    }
  }

  return {
    status: "NOT_REVIEWED",
    reason: "Existing production first-party history does not meet the public beta minimum. This file selects a small pilot subset for human clearance. Nothing here is imported or approved.",
    bridgeExhibitionIds: chosenRecords.filter((record) => (recordArtists.get(record.id) ?? []).filter((artist) => selectedIds.includes(artist.pilotId)).length > 1).map((record) => record.id),
    artists: launchArtists,
    sources: [...sourceMap.values()].sort((a, b) => a.sourceFamily.localeCompare(b.sourceFamily) || a.sourceUrl.localeCompare(b.sourceUrl)),
  };
}
