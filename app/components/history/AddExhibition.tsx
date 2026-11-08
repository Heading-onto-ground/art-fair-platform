"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TopBar from "@/app/components/TopBar";
import { trackHistory } from "@/lib/history/analytics";
import { historyCopy, type HistoryLocale } from "@/lib/history/locale";
import { pushRobEvent, pushRobEventOnce } from "@/lib/publicGrowth/analytics";
import { usePublicHref } from "@/app/components/history/LocaleUrl";
import "./history.css";

export default function AddExhibition({ locale = "en" }: { locale?: HistoryLocale }) {
  const copy = historyCopy(locale);
  const router = useRouter();
  const publicHref = usePublicHref();
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

  useEffect(() => {
    pushRobEventOnce("ADD_EXHIBITION_OPENED", "add", { route: "/history/add" });
  }, []);

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
      const next = publicHref(`/history/add${artistSlug ? `?artist=${artistSlug}` : ""}`);
      router.push(`/login?redirect=${encodeURIComponent(next)}`);
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || copy.couldNotAdd);
      return;
    }
    trackHistory("EXHIBITION_ADDED");
    pushRobEvent("ADD_EXHIBITION_SUBMITTED", { route: "/history/add" });
    if (data.publicationStatus !== "PUBLIC") {
      setMessage(copy.savedForReview);
      return;
    }
    router.push(publicHref(artistSlug ? `/artists/${artistSlug}` : `/exhibitions/${data.slug}`));
  }

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="rh-page">
      <TopBar locale={locale} />
      <main className="rh-wrap">
        <p className="rh-kicker">{copy.addKicker}</p>
        <h1 className="rh-title">{copy.addTitle}</h1>
        <p>{copy.contributionNote}</p>
        <form className="rh-form" onSubmit={onSubmit}>
          <input required aria-label={copy.exhibitionWord} placeholder={copy.exhibitionWord} value={form.title} onChange={(event) => set("title", event.target.value)} />
          <label>
            {copy.datePrecision}
            <select aria-label={copy.datePrecision} value={form.precision} onChange={(event) => set("precision", event.target.value)}>
              <option value="UNKNOWN">{copy.precisionUnknown}</option>
              <option value="YEAR">{copy.precisionYear}</option>
              <option value="MONTH">{copy.precisionMonth}</option>
              <option value="DAY">{copy.precisionDay}</option>
            </select>
          </label>
          <input aria-label={copy.startYear} placeholder={copy.startYear} value={form.year} onChange={(event) => set("year", event.target.value)} />
          <input aria-label={copy.startMonth} placeholder={copy.startMonth} value={form.month} onChange={(event) => set("month", event.target.value)} />
          <input aria-label={copy.startDay} placeholder={copy.startDay} value={form.day} onChange={(event) => set("day", event.target.value)} />
          <input aria-label={copy.endYear} placeholder={copy.endYear} value={form.endYear} onChange={(event) => set("endYear", event.target.value)} />
          <input aria-label={copy.endMonth} placeholder={copy.endMonth} value={form.endMonth} onChange={(event) => set("endMonth", event.target.value)} />
          <input aria-label={copy.endDay} placeholder={copy.endDay} value={form.endDay} onChange={(event) => set("endDay", event.target.value)} />
          <input aria-label={copy.spaceField} placeholder={copy.spaceField} value={form.spaceName} onChange={(event) => set("spaceName", event.target.value)} />
          <input aria-label={copy.cityField} placeholder={copy.cityField} value={form.city} onChange={(event) => set("city", event.target.value)} />
          <input aria-label={copy.countryField} placeholder={copy.countryField} value={form.country} onChange={(event) => set("country", event.target.value)} />
          <input aria-label={copy.curatorField} placeholder={copy.curatorField} value={form.curatorName} onChange={(event) => set("curatorName", event.target.value)} />
          <textarea aria-label={copy.participantsField} placeholder={copy.participantsField} value={form.participants} onChange={(event) => set("participants", event.target.value)} />
          <input aria-label={copy.sourceUrlField} placeholder={copy.sourceUrlField} value={form.sourceUrl} onChange={(event) => set("sourceUrl", event.target.value)} />
          <button className="rh-button" type="submit">{copy.addExhibitionButton}</button>
        </form>
        {message ? <p>{message}</p> : null}
      </main>
    </div>
  );
}
