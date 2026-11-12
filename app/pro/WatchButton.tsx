"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackHistory } from "@/lib/history/analytics";

export default function WatchButton({
  artistEntityId,
  slug,
  watching,
  loginHref,
}: {
  artistEntityId: string;
  slug: string;
  watching: boolean;
  loginHref?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(watching);
  const [pending, setPending] = useState(false);
  if (loginHref) {
    return (
      <a className="pd-watch" href={loginHref}>
        로그인 후 주시
      </a>
    );
  }
  return (
    <button
      type="button"
      className="pd-watch"
      aria-pressed={on}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const response = on
            ? await fetch(`/api/pro/watchlist/${encodeURIComponent(artistEntityId)}`, { method: "DELETE" })
            : await fetch("/api/pro/watchlist", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ artistEntityId }),
              });
          if (!response.ok) return;
          const next = !on;
          setOn(next);
          trackHistory(next ? "PRO_WATCH_ADDED" : "PRO_WATCH_REMOVED", `/artists/${slug}`);
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      {on ? "주시 중" : "주시"}
    </button>
  );
}
