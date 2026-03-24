"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasNewUserPendingActivity,
  pendingSnapshotFromThreads,
  type ThreadForPendingAlert,
} from "@/lib/adminSupportPending";

const POLL_MS = 30_000;

export function useAdminSupportAlerts(enabled: boolean) {
  const [toastOpen, setToastOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const baselineRef = useRef<{ id: string; at: string }[] | null>(null);
  const initializedRef = useRef(false);

  const fetchAndCheck = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/admin/support/threads", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) return;
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        threads?: ThreadForPendingAlert[];
        threadsNeedingReply?: number;
      } | null;
      if (!data?.ok || !Array.isArray(data.threads)) return;

      const snap = pendingSnapshotFromThreads(data.threads);
      const count =
        typeof data.threadsNeedingReply === "number" ? data.threadsNeedingReply : snap.length;
      setPendingCount(count);

      if (!initializedRef.current) {
        baselineRef.current = snap;
        initializedRef.current = true;
        return;
      }

      const prev = baselineRef.current;
      if (hasNewUserPendingActivity(prev, snap)) {
        setToastOpen(true);
      }
      baselineRef.current = snap;
    } catch {
      /* ignore */
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      initializedRef.current = false;
      baselineRef.current = null;
      setPendingCount(0);
      setToastOpen(false);
      return;
    }

    void fetchAndCheck();
    const id = window.setInterval(() => void fetchAndCheck(), POLL_MS);

    function onFocus() {
      void fetchAndCheck();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") void fetchAndCheck();
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, fetchAndCheck]);

  function dismissToast() {
    setToastOpen(false);
  }

  useEffect(() => {
    if (!toastOpen) return;
    const t = window.setTimeout(() => setToastOpen(false), 12_000);
    return () => window.clearTimeout(t);
  }, [toastOpen]);

  return { toastOpen, dismissToast, pendingCount, fetchAndCheck };
}
