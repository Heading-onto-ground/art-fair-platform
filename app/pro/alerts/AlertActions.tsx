"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trackHistory } from "@/lib/history/analytics";

export function MarkAllRead() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function markAll() {
    setPending(true);
    try {
      await fetch("/api/pro/alerts/read-all", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      trackHistory("PRO_ALERT_MARK_ALL_READ", "/pro/alerts");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button className="pd-alert-button" type="button" onClick={markAll} disabled={pending}>
      모두 읽음
    </button>
  );
}

export function AlertActions({
  id,
  href,
  artistSlug,
  read,
}: {
  id: string;
  href: string | null;
  artistSlug: string | null;
  read: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const path = artistSlug ? `/artists/${artistSlug}` : "/pro/alerts";

  async function markRead() {
    setPending(true);
    try {
      await fetch(`/api/pro/alerts/${encodeURIComponent(id)}/read`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      trackHistory("PRO_ALERT_MARKED_READ", path);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pd-alert-actions">
      {href ? (
        <a
          href={href}
          onClick={() => {
            trackHistory("PRO_ALERT_OPENED", href);
            if (!read) void markRead();
          }}
        >
          기록 보기
        </a>
      ) : null}
      {read ? null : (
        <button className="pd-alert-button" type="button" onClick={() => void markRead()} disabled={pending}>
          읽음
        </button>
      )}
    </div>
  );
}
