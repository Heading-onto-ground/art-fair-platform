"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import "./history.css";

export default function AddExhibition() {
  const router = useRouter();
  const params = useSearchParams();
  const artistSlug = params.get("artist");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    precision: "UNKNOWN",
    year: "",
    month: "",
    day: "",
    endYear: "",
    endMonth: "",
    endDay: "",
    spaceName: "",
    city: "",
    country: "",
    curatorName: "",
    participants: "",
    sourceUrl: "",
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    trackHistory("EXHIBITION_ADD_STARTED");
    const response = await fetch("/api/history/exhibitions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        artistSlug,
        participantNames: form.participants.split(/[\n,]/).map((name) => name.trim()).filter(Boolean),
      }),
    });
    if (response.status === 401) {
      router.push(`/login?redirect=${encodeURIComponent(`/history/add${artistSlug ? `?artist=${artistSlug}` : ""}`)}`);
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Could not add the exhibition.");
      return;
    }
    trackHistory("EXHIBITION_ADDED");
    router.push(artistSlug ? `/artists/${artistSlug}` : `/exhibitions/${data.slug}`);
  }

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="rh-page">
      <TopBar />
      <main className="rh-wrap">
        <p className="rh-kicker">Add your first exhibition</p>
        <h1 className="rh-title">Exhibition</h1>
        <form className="rh-form" onSubmit={onSubmit}>
          <input required aria-label="Title" placeholder="Title" value={form.title} onChange={(event) => set("title", event.target.value)} />
          <label>
            Date precision
            <select aria-label="Date precision" value={form.precision} onChange={(event) => set("precision", event.target.value)}>
              <option value="UNKNOWN">Unknown</option>
              <option value="YEAR">Year</option>
              <option value="MONTH">Month</option>
              <option value="DAY">Day</option>
            </select>
          </label>
          <input aria-label="Start year" placeholder="Start year" value={form.year} onChange={(event) => set("year", event.target.value)} />
          <input aria-label="Start month" placeholder="Start month" value={form.month} onChange={(event) => set("month", event.target.value)} />
          <input aria-label="Start day" placeholder="Start day" value={form.day} onChange={(event) => set("day", event.target.value)} />
          <input aria-label="End year" placeholder="End year" value={form.endYear} onChange={(event) => set("endYear", event.target.value)} />
          <input aria-label="End month" placeholder="End month" value={form.endMonth} onChange={(event) => set("endMonth", event.target.value)} />
          <input aria-label="End day" placeholder="End day" value={form.endDay} onChange={(event) => set("endDay", event.target.value)} />
          <input aria-label="Space" placeholder="Space" value={form.spaceName} onChange={(event) => set("spaceName", event.target.value)} />
          <input aria-label="City" placeholder="City" value={form.city} onChange={(event) => set("city", event.target.value)} />
          <input aria-label="Country" placeholder="Country" value={form.country} onChange={(event) => set("country", event.target.value)} />
          <input aria-label="Curator" placeholder="Curator" value={form.curatorName} onChange={(event) => set("curatorName", event.target.value)} />
          <textarea aria-label="Participants" placeholder="Participants, one name per line" value={form.participants} onChange={(event) => set("participants", event.target.value)} />
          <input aria-label="Source URL" placeholder="Source URL" value={form.sourceUrl} onChange={(event) => set("sourceUrl", event.target.value)} />
          <button className="rh-button" type="submit">Add exhibition</button>
        </form>
        {message ? <p>{message}</p> : null}
      </main>
    </div>
  );
}
