"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import type { HistorySearchResult } from "@/lib/history/types";
import "./history.css";

export default function StartHistory() {
  const router = useRouter();
  const params = useSearchParams();
  const preset = params.get("artist");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HistorySearchResult[] | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ canonicalName: "", nativeName: "", birthYear: "", city: "", country: "", officialWebsite: "" });

  async function search(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/history/search?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    setResults(Array.isArray(data.results) ? data.results : []);
    if (!data.results?.length) setMessage("No existing page matches. You can create the artist record.");
  }

  async function claim(slug: string) {
    trackHistory("CLAIM_STARTED");
    const response = await fetch("/api/history/claims", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (response.status === 401) {
      router.push(`/login?redirect=${encodeURIComponent(`/history/start?artist=${slug}`)}`);
      return;
    }
    const data = await response.json();
    if (response.ok) {
      trackHistory("CLAIM_SUBMITTED");
      setMessage("Claim submitted. Status: pending review.");
      return;
    }
    setMessage(data.error || "Could not submit the claim.");
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/history/artists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    if (response.status === 401) {
      router.push(`/login?redirect=${encodeURIComponent("/history/start")}`);
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Could not create the artist.");
      return;
    }
    router.push(`/history/add?artist=${data.slug}`);
  }

  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap">
        <p className="rh-kicker">Start your history</p>
        <h1 className="rh-title">Search yourself.</h1>
        <form className="rh-search" onSubmit={search}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Your name" aria-label="Search yourself" />
          <button className="rh-button" type="submit">Search</button>
        </form>
        {preset ? <p>You asked to claim {preset}. Search that name, or claim it directly if you already know the page.</p> : null}
        {preset ? <button className="rh-text-button" type="button" onClick={() => claim(preset)}>Claim this page</button> : null}
        <ul className="rh-results">
          {(results ?? []).map((artist) => (
            <li key={artist.slug}>
              <Link href={`/artists/${artist.slug}`}>{artist.canonicalName}</Link>
              {artist.nativeName ? <span> {artist.nativeName}</span> : null}
              <div>
                <button className="rh-text-button" type="button" onClick={() => claim(artist.slug)}>Claim this page</button>
              </div>
            </li>
          ))}
        </ul>
        <h2>Create artist record</h2>
        <form className="rh-form" onSubmit={create}>
          <input required placeholder="Artist name" aria-label="Artist name" value={form.canonicalName} onChange={(event) => setForm({ ...form, canonicalName: event.target.value })} />
          <input placeholder="Native name" aria-label="Native name" value={form.nativeName} onChange={(event) => setForm({ ...form, nativeName: event.target.value })} />
          <input placeholder="Birth year" aria-label="Birth year" inputMode="numeric" value={form.birthYear} onChange={(event) => setForm({ ...form, birthYear: event.target.value })} />
          <input placeholder="City" aria-label="City" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
          <input placeholder="Country" aria-label="Country" value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
          <input placeholder="Official website" aria-label="Official website" value={form.officialWebsite} onChange={(event) => setForm({ ...form, officialWebsite: event.target.value })} />
          <button className="rh-button" type="submit">Create artist</button>
        </form>
        {message ? <p>{message}</p> : null}
      </main>
    </div>
  );
}
