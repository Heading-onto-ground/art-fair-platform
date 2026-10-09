import { uniqueSlug } from "@/lib/history/policy";

export type BackfillProfile = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  website: string | null;
  startedYear: number | null;
};

export function planBackfill(profiles: BackfillProfile[], taken: Iterable<string> = []) {
  const used = new Set(taken);
  return profiles.map((profile) => {
    const slug = uniqueSlug(profile.name, used);
    used.add(slug);
    return {
      profileId: profile.id,
      slug,
      canonicalName: profile.name,
      nativeName: null as string | null,
      birthYear: null as number | null,
      country: profile.country,
      city: profile.city,
      officialWebsite: profile.website,
    };
  });
}
