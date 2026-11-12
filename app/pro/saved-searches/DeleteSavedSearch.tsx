"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trackHistory } from "@/lib/history/analytics";

export default function DeleteSavedSearch({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="pd-watch"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const response = await fetch(`/api/pro/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (!response.ok) return;
          trackHistory("PRO_SAVED_SEARCH_DELETED", "/pro/saved-searches");
          router.refresh();
        } finally {
          setPending(false);
        }
      }}
    >
      삭제
    </button>
  );
}
