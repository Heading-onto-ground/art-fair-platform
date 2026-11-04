import type { GrowthSnapshot } from "@/lib/history/growth";
import { aliasLookupEqual } from "@/lib/history/identity";
import {
  crawlerCanFetch,
  discoverTrustedSources,
  matchTrustedGalleryRoster,
  selectDiscoveryEntity,
  TRUSTED_GALLERY_ROSTERS,
  type DiscoveryEntity,
  type DiscoveryInstitution,
} from "@/lib/history/sourceDiscovery";
import { crawlTrustedPage, fetchTrustedDocument, type CrawlFact, type TrustedFetchResult } from "@/lib/history/trustedCrawl";
import {
  RESEARCH_LIMITS,
  emptyPayload,
  factView,
  mayPublishCrawledFact,
  researchSlugBase,
  withEvents,
  type ResearchJobRecord,
  type ResearchPayload,
  type ResearchSource,
} from "@/lib/history/researchJob";

export type KnownArtist = {
  id: string;
  slug: string;
  canonicalName: string;
  nativeName: string | null;
  exhibitionCount: number;
};

export type IdentityLookup = {
  entities: DiscoveryEntity[];
  institutions: DiscoveryInstitution[];
  error: "SOURCE_RATE_LIMITED" | "FETCH_FAILED" | null;
};

export type PublishResult = { ok: true; artistId: string; artistSlug: string } | { ok: false; code: string };

export type ResearchDeps = {
  now: () => Date;
  findKnown: (query: string) => Promise<KnownArtist | null>;
  lookupIdentity: (query: string) => Promise<IdentityLookup>;
  loadInstitutions: (ids: string[]) => Promise<DiscoveryInstitution[]>;
  fetchDocument: (url: string) => Promise<TrustedFetchResult>;
  loadSnapshot: () => Promise<GrowthSnapshot | null>;
  publish: (job: ResearchJobRecord, fact: CrawlFact) => Promise<PublishResult>;
};

const EMPTY_SNAPSHOT: GrowthSnapshot = { artists: [], exhibitions: [], unresolved: [] };

function touch(job: ResearchJobRecord, patch: Partial<ResearchJobRecord> & { payload?: ResearchPayload }, now: Date): ResearchJobRecord {
  const next: ResearchJobRecord = {
    ...job,
    ...patch,
    payload: patch.payload ?? job.payload,
    updatedAt: now.toISOString(),
  };
  if (next.stage === "DONE" && !next.completedAt) next.completedAt = now.toISOString();
  return withEvents(job, next);
}

function close(job: ResearchJobRecord, status: ResearchJobRecord["status"], code: string | null, now: Date): ResearchJobRecord {
  return touch(job, { status, stage: "DONE", failureCode: code, completedAt: now.toISOString(), payload: { ...job.payload, stepCount: job.payload.stepCount + 1 } }, now);
}

export async function advanceResearchJob(job: ResearchJobRecord, deps: ResearchDeps): Promise<ResearchJobRecord> {
  if (job.stage === "DONE") return job;
  if (job.payload.stepCount >= RESEARCH_LIMITS.maxSteps) {
    const status = job.verifiedFactCount >= 3 ? "HISTORY_READY" : job.verifiedFactCount > 0 ? "PARTIAL_RESULT" : "NEEDS_REVIEW";
    return close(job, status, job.verifiedFactCount > 0 ? null : "STEP_LIMIT", deps.now());
  }
  if (job.stage === "IDENTITY") return identityStep(job, deps);
  if (job.stage === "SOURCES") return sourceStep(job, deps);
  if (job.stage === "FETCH") return fetchStep(job, deps);
  if (job.stage === "PUBLISH") return publishStep(job, deps);
  return job;
}

async function identityStep(job: ResearchJobRecord, deps: ResearchDeps): Promise<ResearchJobRecord> {
  const now = deps.now();
  const known = await deps.findKnown(job.query);
  if (known && known.exhibitionCount > 0 && !job.payload.expand) {
    return close({
      ...job,
      resolvedArtistId: known.id,
      resolvedArtistSlug: known.slug,
      resultArtistSlug: known.slug,
      identityStatus: "KNOWN",
    }, known.exhibitionCount >= 3 ? "HISTORY_READY" : "PARTIAL_RESULT", null, now);
  }
  if (known) {
    const payload: ResearchPayload = {
      ...job.payload,
      stepCount: job.payload.stepCount + 1,
      latinName: known.canonicalName,
      nativeName: known.nativeName,
      labels: [known.canonicalName, known.nativeName, job.query].filter((value): value is string => Boolean(value)),
      proposedSlug: known.slug,
    };
    return touch(job, {
      stage: "SOURCES",
      status: known.exhibitionCount > 0 ? "PARTIAL_RESULT" : "RESEARCHING",
      identityStatus: "KNOWN",
      resolvedArtistId: known.id,
      resolvedArtistSlug: known.slug,
      resultArtistSlug: known.exhibitionCount > 0 ? known.slug : job.resultArtistSlug,
      payload,
    }, now);
  }
  const lookup = await deps.lookupIdentity(job.query);
  if (lookup.error) {
    return touch(job, {
      failureCode: lookup.error,
      failureDetail: null,
      payload: { ...job.payload, stepCount: job.payload.stepCount + 1 },
    }, now);
  }
  const choice = selectDiscoveryEntity(lookup.entities, researchSlugBase(null, job.normalizedQuery), [job.query]);
  if (!choice.selected) {
    const ambiguous = lookup.entities.length > 0;
    return close(job, ambiguous ? "NEEDS_REVIEW" : "NOT_FOUND", ambiguous ? "IDENTITY_AMBIGUOUS" : "IDENTITY_NOT_FOUND", now);
  }
  const latin = /[A-Za-z]/.test(choice.selected.label) ? choice.selected.label : choice.selected.aliases.find((alias) => /[A-Za-z]/.test(alias)) ?? null;
  const native = [choice.selected.label, ...choice.selected.aliases].find((label) => /[가-힣]/.test(label)) ?? null;
  const labels = [...new Set([job.query, choice.selected.label, ...choice.selected.aliases].filter(Boolean))].slice(0, 12);
  const payload: ResearchPayload = {
    ...job.payload,
    stepCount: job.payload.stepCount + 1,
    latinName: latin,
    nativeName: native,
    labels,
    proposedSlug: researchSlugBase(latin, job.normalizedQuery),
    identity: choice.selected,
  };
  return touch(job, {
    stage: "SOURCES",
    identityStatus: "RESOLVED",
    payload,
    failureCode: null,
  }, now);
}

async function sourceStep(job: ResearchJobRecord, deps: ResearchDeps): Promise<ResearchJobRecord> {
  const now = deps.now();
  const identity = job.payload.identity;
  const slug = job.payload.proposedSlug;
  if (!identity || !slug) return close(job, "NEEDS_REVIEW", "IDENTITY_NOT_FOUND", now);
  let institutions = job.payload.institutions;
  if (institutions.length === 0 && identity.collectionIds.length > 0) {
    institutions = await deps.loadInstitutions(identity.collectionIds.slice(0, RESEARCH_LIMITS.maxInstitutions));
  }
  const discovered = discoverTrustedSources({
    artistId: slug,
    entities: [identity],
    institutions,
    matchLabels: [job.query, identity.label, ...identity.aliases],
  });
  if (!discovered.resolvedEntityId) return close(job, "NEEDS_REVIEW", "IDENTITY_AMBIGUOUS", now);
  const sources: ResearchSource[] = discovered.candidates.map((candidate) => ({
    url: candidate.sourceUrl,
    name: candidate.sourceName,
    fetchable: crawlerCanFetch(candidate.sourceUrl),
    checked: false,
    blocked: null,
  }));
  const hasArtistRecord = sources.some((source) => source.fetchable && /\/artists\/view|\/exhibitions\/|\/exhibition\//.test(source.url));
  if (!hasArtistRecord) {
    const labels = [job.query, identity.label, ...identity.aliases];
    for (const roster of TRUSTED_GALLERY_ROSTERS) {
      const index = await deps.fetchDocument(roster.indexUrl);
      if (index.blocked || !index.html) continue;
      const match = matchTrustedGalleryRoster(index.html, labels, roster.indexUrl);
      if (!match || !crawlerCanFetch(match.url) || sources.some((source) => source.url === match.url)) continue;
      sources.unshift({ url: match.url, name: match.sourceName, fetchable: true, checked: false, blocked: null });
      break;
    }
  }
  const recordUrl = (url: string) => /\/artists\/view|\/exhibitions\/|\/exhibition\//.test(url);
  const ordered = [
    ...sources.filter((source) => source.fetchable && recordUrl(source.url)),
    ...sources.filter((source) => source.fetchable && !recordUrl(source.url)),
    ...sources.filter((source) => !source.fetchable),
  ].slice(0, RESEARCH_LIMITS.maxSourcesChecked);
  const hasRecord = ordered.some((source) => source.fetchable && recordUrl(source.url));
  const selected = ordered.map((source) => hasRecord && source.fetchable && !recordUrl(source.url)
    ? { ...source, fetchable: false }
    : source);
  const payload: ResearchPayload = { ...job.payload, stepCount: job.payload.stepCount + 1, institutions, sources: selected };
  if (!selected.some((source) => source.fetchable)) {
    return close({ ...job, sourcesFound: selected.length, payload }, "NEEDS_REVIEW", "NO_TRUSTED_SOURCE", now);
  }
  return touch(job, { stage: "FETCH", sourcesFound: selected.length, payload, failureCode: null }, now);
}

async function fetchStep(job: ResearchJobRecord, deps: ResearchDeps): Promise<ResearchJobRecord> {
  const now = deps.now();
  const pages = job.payload.sources.filter((source) => source.checked && source.fetchable).length;
  const next = job.payload.sources.find((source) => source.fetchable && !source.checked);
  if (!next || pages >= RESEARCH_LIMITS.maxPagesFetched) return afterFetch(job, deps, now);
  const fetched = await deps.fetchDocument(next.url);
  const sources = job.payload.sources.map((source) => source.url === next.url
    ? { ...source, checked: true, blocked: fetched.blocked || null }
    : source);
  const blockedSourceCount = sources.filter((source) => source.blocked).length;
  const sourcesChecked = sources.filter((source) => source.checked).length;
  let verified = job.payload.verified;
  let queued = job.payload.queued;
  let reviewFactCount = job.reviewFactCount;
  if (!fetched.blocked && (fetched.html || fetched.json)) {
    const snapshot = await deps.loadSnapshot();
    const artists = [{ slug: job.payload.proposedSlug ?? "", labels: job.payload.labels }];
    const facts = crawlTrustedPage({
      url: next.url,
      retrievedAt: now.toISOString(),
      html: fetched.html,
      json: fetched.json,
      artists,
      snapshot: snapshot ?? EMPTY_SNAPSHOT,
      snapshotReady: snapshot !== null,
    });
    for (const fact of facts) {
      if (mayPublishCrawledFact(fact)) {
        const view = factView(fact);
        if (view && !verified.some((item) => item.pilotRecordId === view.pilotRecordId)) {
          verified = [...verified, view];
          queued = [...queued, fact];
        }
      } else if (fact.decision === "REVIEW_QUEUE" || fact.decision === "HOLD") {
        reviewFactCount += 1;
      }
    }
  }
  const payload: ResearchPayload = {
    ...job.payload,
    stepCount: job.payload.stepCount + 1,
    sources,
    verified: verified.slice(0, 12),
    queued: queued.filter((fact) => verified.slice(0, 12).some((view) => view.pilotRecordId === fact.pilotRecordId)).slice(0, 12),
  };
  return touch(job, {
    status: job.payload.publishedIds.length > 0 ? "PARTIAL_RESULT" : "RESEARCHING",
    sourcesChecked,
    blockedSourceCount,
    verifiedFactCount: job.payload.publishedIds.length,
    reviewFactCount,
    payload,
    failureCode: null,
  }, now);
}

function afterFetch(job: ResearchJobRecord, deps: ResearchDeps, now: Date): ResearchJobRecord {
  if (job.payload.verified.length > 0) {
    return touch(job, {
      stage: "PUBLISH",
      status: job.payload.publishedIds.length > 0 ? "PARTIAL_RESULT" : "RESEARCHING",
      payload: { ...job.payload, stepCount: job.payload.stepCount + 1 },
    }, now);
  }
  if (job.blockedSourceCount > 0) return close(job, "SOURCE_BLOCKED", "SOURCE_BLOCKED", now);
  return close(job, "NEEDS_REVIEW", "NO_TRUSTED_SOURCE", now);
}

async function publishStep(job: ResearchJobRecord, deps: ResearchDeps): Promise<ResearchJobRecord> {
  const now = deps.now();
  const pending = job.payload.verified.find((fact) => !job.payload.publishedIds.includes(fact.pilotRecordId));
  if (!pending) {
    const status = job.verifiedFactCount >= 3 ? "HISTORY_READY" : "PARTIAL_RESULT";
    return close(job, status, null, now);
  }
  const match = job.payload.queued.find((fact) => fact.pilotRecordId === pending.pilotRecordId && mayPublishCrawledFact(fact));
  if (!match) return holdFact(job, pending.pilotRecordId, "PUBLICATION_REVIEW", now);
  const subject = match.participants.find((person) => person.identity === "EXACT" && person.slug);
  const subjectIsPageArtist = Boolean(subject && job.payload.labels.some((label) => aliasLookupEqual(label, subject.label)));
  if (!subjectIsPageArtist) return holdFact(job, pending.pilotRecordId, "PARTICIPATION_AMBIGUOUS", now);
  const published = await deps.publish(job, match);
  if (!published.ok) return holdFact(job, pending.pilotRecordId, published.code, now);
  const payload: ResearchPayload = {
    ...job.payload,
    stepCount: job.payload.stepCount + 1,
    publishedIds: [...job.payload.publishedIds, pending.pilotRecordId],
    proposedSlug: published.artistSlug,
  };
  const remaining = payload.verified.some((fact) => !payload.publishedIds.includes(fact.pilotRecordId));
  const finished = !remaining;
  return touch(job, {
    stage: finished ? "DONE" : "PUBLISH",
    status: finished && payload.publishedIds.length >= 3 ? "HISTORY_READY" : "PARTIAL_RESULT",
    completedAt: finished ? now.toISOString() : job.completedAt,
    verifiedFactCount: payload.publishedIds.length,
    resolvedArtistId: published.artistId,
    resolvedArtistSlug: published.artistSlug,
    resultArtistSlug: published.artistSlug,
    payload,
    failureCode: null,
  }, now);
}

function holdFact(job: ResearchJobRecord, pilotRecordId: string, code: string, now: Date): ResearchJobRecord {
  const verified = job.payload.verified.filter((fact) => fact.pilotRecordId !== pilotRecordId);
  const payload: ResearchPayload = {
    ...job.payload,
    stepCount: job.payload.stepCount + 1,
    verified,
    queued: job.payload.queued.filter((fact) => fact.pilotRecordId !== pilotRecordId),
  };
  const status = verified.length > 0 ? "PARTIAL_RESULT" : "NEEDS_REVIEW";
  return touch(job, {
    status,
    stage: verified.length > 0 ? "PUBLISH" : "DONE",
    verifiedFactCount: payload.publishedIds.length,
    reviewFactCount: job.reviewFactCount + 1,
    failureCode: verified.length > 0 ? null : code,
    payload,
  }, now);
}

export function blankJob(input: {
  id: string;
  query: string;
  normalizedQuery: string;
  locale: ResearchJobRecord["locale"];
  demandQuality: string;
  expand: boolean;
  now: Date;
}): ResearchJobRecord {
  const stamp = input.now.toISOString();
  return {
    id: input.id,
    query: input.query.trim(),
    normalizedQuery: input.normalizedQuery,
    locale: input.locale,
    status: "RESEARCHING",
    stage: "IDENTITY",
    demandQuality: input.demandQuality,
    requestedAt: stamp,
    startedAt: stamp,
    updatedAt: stamp,
    completedAt: null,
    resolvedArtistId: null,
    resolvedArtistSlug: null,
    identityStatus: null,
    sourcesFound: 0,
    sourcesChecked: 0,
    verifiedFactCount: 0,
    reviewFactCount: 0,
    blockedSourceCount: 0,
    failureCode: null,
    failureDetail: null,
    resultArtistSlug: null,
    payload: emptyPayload(input.expand),
  };
}

export { fetchTrustedDocument };
