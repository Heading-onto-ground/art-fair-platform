"use client";

import { useEffect, useState } from "react";
import { normalizeCountry } from "@/lib/countries";

/**
 * Country hint for non-language features (the artist open-call filter).
 * This hook does not choose the interface language, does not write afp_lang,
 * does not request GPS, and does not change the profile country.
 * Language uses the server resolver and the Vercel country header instead.
 */
export function useAutoLocale() {
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedCountry = localStorage.getItem("afp_country") || "";
    const storedCity = localStorage.getItem("afp_city") || "";
    if (storedCountry) setCountry(storedCountry);
    if (storedCity) setCity(storedCity);

    let cancelled = false;
    fetch("/api/geo", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data?.country) return;
        const normalized = normalizeCountry(data.country);
        setCountry(normalized);
        localStorage.setItem("afp_country", normalized);
        if (data.city) {
          setCity(data.city);
          localStorage.setItem("afp_city", data.city);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    country: mounted ? country : "",
    city: mounted ? city : "",
    mounted,
  };
}
