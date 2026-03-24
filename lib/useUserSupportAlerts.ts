"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  hasNewAdminMessageSincePoll,
  mergeSeenAdminIds,
  readSeenAdminSupportIds,
  SUPPORT_SEEN_EVENT,
  unreadAdminSupportCount,
  type SupportMsgLite,
} from "@/lib/userSupportPending";

const POLL_MS = 30_000;

export function useUserSupportAlerts(enabled: boolean) {
  const pathname = usePathname();
  const [toastOpen, setToastOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const pollBaselineRef = useRef<Set<string> | null>(null);
  const initializedRef = useRef(false);

  const applyMessages = useCallback((messages: SupportMsgLite[]) => {
    const adminIds = messages.filter((m) => m.fromAdmin).map((m) => m.id);
    const onSupportPage = pathname === "/support";

    if (onSupportPage) {
      mergeSeenAdminIds(adminIds);
      setUnreadCount(0);
      pollBaselineRef.current = new Set(adminIds);
      initializedRef.current = true;
      return;
    }

    const seen = readSeenAdminSupportIds();
    if (!initializedRef.current) {
      if (adminIds.length > 0 && seen.size === 0) {
        mergeSeenAdminIds(adminIds);
      }
      setUnreadCount(unreadAdminSupportCount(messages));
      pollBaselineRef.current = new Set(adminIds);
      initializedRef.current = true;
      return;
    }

    setUnreadCount(unreadAdminSupportCount(messages));

    if (hasNewAdminMessageSincePoll(pollBaselineRef.current ?? new Set(), adminIds)) {
      setToastOpen(true);
    }
    pollBaselineRef.current = new Set(adminIds);
  }, [pathname]);

  const fetchAndCheck = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch("/api/support/messages", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 401) return;
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        messages?: SupportMsgLite[];
      } | null;
      if (!data?.ok || !Array.isArray(data.messages)) return;
      applyMessages(data.messages);
    } catch {
      /* ignore */
    }
  }, [enabled, applyMessages]);

  useEffect(() => {
    if (!enabled) {
      initializedRef.current = false;
      pollBaselineRef.current = null;
      setUnreadCount(0);
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
    function onSeenEvent() {
      void fetchAndCheck();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(SUPPORT_SEEN_EVENT, onSeenEvent);

    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(SUPPORT_SEEN_EVENT, onSeenEvent);
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

  return { toastOpen, dismissToast, unreadCount, fetchAndCheck };
}
