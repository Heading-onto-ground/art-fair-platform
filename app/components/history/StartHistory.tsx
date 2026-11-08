"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import type { HistorySearchResult } from "@/lib/history/types";
import { usePublicHref } from "@/app/components/history/LocaleUrl";
import { historyCopy, type HistoryLocale } from "@/lib/history/locale";
import { artistDisplayNames } from "@/lib/history/names";
import "./history.css";

export default function StartHistory({ locale = "en" }: { locale?: HistoryLocale }) {
  const router = useRouter();
  const publicHref = usePublicHref();
  const params = useSearchParams();
  const copy = historyCopy(locale);
  const preset = params.get("artist");
  const [query, setQuery] = useState("");
  const [existingSlug, setExistingSlug] = useState<string | null>(null);
  const [results, setResults] = useState<HistorySearchResult[] | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ canonicalName: "", nativeName: "", birthYear: "", city: "", country: "", officialWebsite: "" });

  async function search(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(`/api/history/search?q=${encodeURIComponent(q)}`, { signal: controller.signal, cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || data.unavailable) {
        setResults([]);
        setMessage(copy.searchError);
        return;
      }
      const found = Array.isArray(data.results) ? data.results as HistorySearchResult[] : [];
      setResults(found);
      setMessage(found.length === 0 ? copy.noExistingPage : "");
    } catch {
      setResults([]);
      setMessage(copy.searchError);
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function claim(slug: string) {
    trackHistory("CLAIM_STARTED");
    const response = await fetch("/api/history/claims", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (response.status === 401) {
      router.push(`/login?redirect=${encodeURIComponent(publicHref(`/history/start?artist=${slug}`))}`);
      return;
    }
    const data = await response.json();
    if (response.ok) {
      if (data.status === "APPROVED") {
        setMessage(copy.claimApproved);
        return;
      }
      if (data.alreadyPending) {
        setMessage(copy.claimPending);
        return;
      }
      trackHistory("CLAIM_SUBMITTED");
      setMessage(copy.claimSubmitted);
      return;
    }
    setMessage(data.error || copy.couldNotClaim);
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/history/artists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.status === 401) {
      router.push(`/login?redirect=${encodeURIComponent(publicHref("/history/start"))}`);
      return;
    }
    const data = await response.json();
    if (response.status === 409 && data?.existing && typeof data.slug === "string") {
      setExistingSlug(data.slug);
      setMessage(copy.existingArtist);
      return;
    }
    if (!response.ok) {
      setMessage(data?.error === "ambiguous" ? copy.ambiguousArtist : copy.couldNotCreate);
      return;
    }
    router.push(publicHref(`/history/add?artist=${data.slug}`));
  }

  return (
    <div className="rh-page">
      <TopBar locale={locale} />
      <main className="rh-wrap">
        <p className="rh-kicker">{copy.startKicker}</p>
        <h1 className="rh-title">{copy.searchYourself}</h1>
        <p>{copy.contributionNote}</p>
        <form className="rh-search" onSubmit={search}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.yourName} aria-label={copy.searchYourself} />
          <button className="rh-button" type="submit">{copy.searchButton}</button>
        </form>
        {preset ? <p>{copy.claimPrompt(preset)}</p> : null}
        {preset ? <button className="rh-text-button" type="button" onClick={() => claim(preset)}>{copy.claimThis}</button> : null}
        <ul className="rh-results">
          {(results ?? []).map((artist) => {
            const names = artistDisplayNames({ canonicalName: artist.canonicalName, nativeName: artist.nativeName, locale });
            return (
            <li key={artist.slug}>
              <Link href={publicHref(`/artists/${artist.slug}`)}>{names.primary}</Link>
              {names.secondary ? <span className="rh-name-secondary"> {names.secondary}</span> : null}
              <div>
                <button className="rh-text-button" type="button" onClick={() => claim(artist.slug)}>{copy.claimThis}</button>
              </div>
            </li>
            );
          })}
        </ul>
        {existingSlug ? <button className="rh-text-button" type="button" onClick={() => claim(existingSlug)}>{copy.claimThis}</button> : null}
        <h2>{copy.createRecord}</h2>
        <form className="rh-form" onSubmit={create}>
          <input required placeholder={copy.artistNameField} aria-label={copy.artistNameField} value={form.canonicalName} onChange={(event) => setForm({ ...form, canonicalName: event.target.value })} />
          <input placeholder={copy.nativeNameField} aria-label={copy.nativeNameField} value={form.nativeName} onChange={(event) => setForm({ ...form, nativeName: event.target.value })} />
          <input placeholder={copy.birthYearField} aria-label={copy.birthYearField} inputMode="numeric" value={form.birthYear} onChange={(event) => setForm({ ...form, birthYear: event.target.value })} />
          <input placeholder={copy.cityField} aria-label={copy.cityField} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <input placeholder={copy.countryField} aria-label={copy.countryField} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
          <input placeholder={copy.officialWebsiteField} aria-label={copy.officialWebsiteField} value={form.officialWebsite} onChange={(event) => setForm({ ...form, officialWebsite: event.target.value })} />
          <button className="rh-button" type="submit">{copy.createArtistButton}</button>
        </form>
        {message ? <p>{message}</p> : null}
      </main>
    </div>
  );
}
