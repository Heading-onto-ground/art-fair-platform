export const JOURNEY_TRAIL_LIMIT = 8;
export const JOURNEY_QUERY = "j";

const STORE_KEY = "rob-journey-v1";
const JOURNEY_ID = /^[a-z0-9]{8}$/;

export type JourneyMode = "all" | "decade" | "year";

export type JourneyStep = {
  artist: string;
  mode: JourneyMode | null;
  focus: string | null;
  exhibition: string | null;
  scrollY: number | null;
};

type JourneyStore = {
  id: string;
  steps: JourneyStep[];
  cursor: JourneyStep | null;
};

type JourneyStorage = Pick<Storage, "getItem" | "setItem">;

export function newJourneyId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return [...bytes].map((value) => (value % 36).toString(36)).join("");
}

export function validJourneyId(value: string | null): string | null {
  return value && JOURNEY_ID.test(value) ? value : null;
}

function cleanStep(step: JourneyStep): JourneyStep | null {
  const artist = step.artist.trim();
  if (!artist) return null;
  const mode = step.mode === "decade" || step.mode === "year" || step.mode === "all" ? step.mode : null;
  const focus = step.focus?.trim() || null;
  const exhibition = step.exhibition?.trim() || null;
  const scrollY = typeof step.scrollY === "number" && Number.isFinite(step.scrollY) ? Math.max(0, Math.round(step.scrollY)) : null;
  return { artist, mode, focus, exhibition, scrollY };
}

export function pushJourneyStep(trail: readonly JourneyStep[], step: JourneyStep, limit = JOURNEY_TRAIL_LIMIT): JourneyStep[] {
  const cleaned = cleanStep(step);
  if (!cleaned) return [...trail];
  const next = [...trail, cleaned];
  return next.length > limit ? next.slice(next.length - limit) : next;
}

export function followArtistHref(destinationSlug: string, journeyId: string, via: string | null): string {
  const params = new URLSearchParams();
  const id = validJourneyId(journeyId);
  if (id) params.set(JOURNEY_QUERY, id);
  if (via) params.set("via", via);
  const query = params.toString();
  return `/artists/${destinationSlug}${query ? `?${query}` : ""}`;
}

export function restoredJourneyHref(step: JourneyStep, journeyId: string | null): string {
  const params = new URLSearchParams();
  const id = validJourneyId(journeyId);
  if (id) params.set(JOURNEY_QUERY, id);
  if (step.exhibition) params.set("event", step.exhibition);
  if (step.mode === "decade" || step.mode === "year") params.set("zoom", step.mode);
  if (step.focus) params.set("focus", step.focus);
  const query = params.toString();
  return `/artists/${step.artist}${query ? `?${query}` : ""}`;
}

export function withPreservedSearch(
  path: string,
  searchParams: Record<string, string | string[] | undefined> | undefined,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (typeof value === "string") params.append(key, value);
    else if (Array.isArray(value)) for (const item of value) params.append(key, item);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function readStore(storage: JourneyStorage): JourneyStore | null {
  try {
    const raw = storage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<JourneyStore>;
    const id = validJourneyId(typeof parsed.id === "string" ? parsed.id : null);
    if (!id || !Array.isArray(parsed.steps)) return null;
    const steps = parsed.steps.flatMap((step) => {
      if (!step || typeof step !== "object") return [];
      const cleaned = cleanStep(step as JourneyStep);
      return cleaned ? [cleaned] : [];
    });
    const cursor = parsed.cursor && typeof parsed.cursor === "object" ? cleanStep(parsed.cursor as JourneyStep) : null;
    return { id, steps: steps.slice(-JOURNEY_TRAIL_LIMIT), cursor };
  } catch {
    return null;
  }
}

function writeStore(storage: JourneyStorage, store: JourneyStore) {
  storage.setItem(STORE_KEY, JSON.stringify(store));
}

export function readJourneySteps(storage: JourneyStorage, journeyId: string | null): JourneyStep[] {
  const id = validJourneyId(journeyId);
  const store = id ? readStore(storage) : null;
  return store && store.id === id ? store.steps : [];
}

export function rememberJourneyCursor(storage: JourneyStorage, journeyId: string, step: JourneyStep) {
  const id = validJourneyId(journeyId);
  const cleaned = cleanStep(step);
  if (!id || !cleaned) return;
  const current = readStore(storage);
  const steps = current?.id === id ? current.steps : [];
  writeStore(storage, { id, steps, cursor: cleaned });
}

export function extendJourney(storage: JourneyStorage, journeyId: string, step: JourneyStep): JourneyStep[] {
  const id = validJourneyId(journeyId);
  const cleaned = cleanStep(step);
  if (!id || !cleaned) return readJourneySteps(storage, journeyId);
  const current = readStore(storage);
  const base = current?.id === id ? current.steps : [];
  const steps = pushJourneyStep(base, cleaned);
  writeStore(storage, { id, steps, cursor: cleaned });
  return steps;
}

export function retreatJourney(storage: JourneyStorage, journeyId: string | null): { step: JourneyStep; rest: JourneyStep[] } | null {
  const steps = readJourneySteps(storage, journeyId);
  const id = validJourneyId(journeyId);
  if (!id || steps.length === 0) return null;
  const step = steps[steps.length - 1];
  const rest = steps.slice(0, -1);
  writeStore(storage, { id, steps: rest, cursor: step });
  return { step, rest };
}

export function continueJourneyHref(storage: JourneyStorage, destinationSlug: string, via: string | null): string | null {
  const store = readStore(storage);
  if (!store?.cursor || store.cursor.artist === destinationSlug) return null;
  const steps = extendJourney(storage, store.id, store.cursor);
  if (steps.length === 0) return null;
  return followArtistHref(destinationSlug, store.id, via);
}
