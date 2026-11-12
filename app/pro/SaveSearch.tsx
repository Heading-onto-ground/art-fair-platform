"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackHistory } from "@/lib/history/analytics";
import type { CanonicalFilter } from "@/lib/pro/privatePolicy";

export default function SaveSearch({
  filters,
  loginHref,
}: {
  filters: CanonicalFilter | null;
  loginHref?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!filters) return null;
  if (loginHref) {
    return (
      <p>
        <a href={loginHref}>로그인하고 이 조건 저장</a>
      </p>
    );
  }
  return (
    <form
      className="pd-save"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage(null);
        try {
          const response = await fetch("/api/pro/saved-searches", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, filters }),
          });
          if (!response.ok) {
            setMessage("이 조건은 저장할 수 없습니다.");
            return;
          }
          trackHistory("PRO_SAVED_SEARCH_CREATED", "/pro/discover");
          router.push("/pro/saved-searches");
        } finally {
          setPending(false);
        }
      }}
    >
      <label htmlFor="saved-search-name">
        검색 이름
        <input id="saved-search-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
      </label>
      <button type="submit" disabled={pending}>
        이 조건 저장
      </button>
      {message ? <p>{message}</p> : null}
    </form>
  );
}
