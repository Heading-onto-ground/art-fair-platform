export function normalizeCountry(input: string): string {
  const v = String(input || "").trim();
  if (!v) return "";
  const k = v.replace(/\s+/g, "").toLowerCase();
  const alias: Record<string, string> = {
    "한국": "한국",
    "대한민국": "한국",
    "southkorea": "한국",
    "republicofkorea": "한국",
    "japan": "일본",
    "일본": "일본",
    "nippon": "일본",
    "usa": "미국",
    "unitedstates": "미국",
    "unitedstatesofamerica": "미국",
    "미국": "미국",
    "uk": "영국",
    "unitedkingdom": "영국",
    "영국": "영국",
    "france": "프랑스",
    "프랑스": "프랑스",
    "germany": "독일",
    "독일": "독일",
    "italy": "이탈리아",
    "이탈리아": "이탈리아",
    "switzerland": "스위스",
    "스위스": "스위스",
    "china": "중국",
    "중국": "중국",
    "australia": "호주",
    "호주": "호주",
    "uae": "아랍에미리트",
    "unitedarabemirates": "아랍에미리트",
    "아랍에미리트": "아랍에미리트",
  };
  return alias[k] || v;
}

export function getCountryUtcOffsetMinutes(countryInput: string): number {
  const c = normalizeCountry(countryInput);
  const table: Record<string, number> = {
    "한국": 9 * 60,
    "일본": 9 * 60,
    "중국": 8 * 60,
    "싱가포르": 8 * 60,
    "영국": 0,
    "프랑스": 1 * 60,
    "독일": 1 * 60,
    "이탈리아": 1 * 60,
    "스위스": 1 * 60,
    "미국": -5 * 60,
    "캐나다": -5 * 60,
    "호주": 10 * 60,
    "아랍에미리트": 4 * 60,
  };
  return table[c] ?? 0;
}

export function getLocalHour(date: Date, countryInput: string): number {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(utcMs + getCountryUtcOffsetMinutes(countryInput) * 60 * 1000);
  return local.getHours();
}

export function shouldSendNowForCountry(
  date: Date,
  countryInput: string,
  startHourInclusive = 8,
  endHourExclusive = 11
): boolean {
  const h = getLocalHour(date, countryInput);
  return h >= startHourInclusive && h < endHourExclusive;
}

export function getLocalizedOnboardingGuide(countryInput: string) {
  const country = normalizeCountry(countryInput);
  if (country === "한국") {
    return {
      title: "Korea onboarding path",
      checklist: [
        "Set KR/EN profile fields for global review",
        "Prepare domestic shipping + invoice format",
        "Add portfolio + 3 recent activity records",
      ],
    };
  }
  if (country === "일본") {
    return {
      title: "Japan onboarding path",
      checklist: [
        "Use JP/EN profile naming consistency",
        "Prepare customs-friendly artwork documentation",
        "Add exhibition timeline with curator context",
      ],
    };
  }
  return {
    title: "Global onboarding path",
    checklist: [
      "Complete profile in English for cross-border discovery",
      "Set portfolio and contact channels",
      "Track open-call deadlines and response workflow",
    ],
  };
}
