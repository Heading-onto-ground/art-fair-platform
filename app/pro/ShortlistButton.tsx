"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackHistory } from "@/lib/history/analytics";

export default function ShortlistButton({
  artistEntityId,
  slug,
  shortlisted,
  loginHref,
}: {
  artistEntityId: string;
  slug: string;
  shortlisted: boolean;
  loginHref?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(shortlisted);
  const [pending, setPending] = useState(false);
  if (loginHref) {
    return (
      <a className="pd-shortlist" href={loginHref}>
        로그인 후 숏리스트
      </a>
    );
  }
  return (
    <button
      type="button"
      className="pd-shortlist"
      aria-pressed={on}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const response = on
            ? await fetch(`/api/pro/shortlist/${encodeURIComponent(artistEntityId)}`, { method: "DELETE" })
            : await fetch("/api/pro/shortlist", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ artistEntityId }),
              });
          if (!response.ok) return;
          const next = !on;
          setOn(next);
          trackHistory(next ? "PRO_SHORTLIST_ADDED" : "PRO_SHORTLIST_REMOVED", `/artists/${slug}`);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {on ? "숏리스트에 있음" : "숏리스트"}
    </button>
  );
}
