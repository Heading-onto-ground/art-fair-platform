"use client";

import { useEffect, useRef, useState } from "react";
import { F } from "@/lib/design";

type NotifItem = { id: string; type: string; payload: any; createdAt: number };

const TYPE_TITLES: Record<string, string> = {
  "community.post.like": "New like on your post",
  "community.comment.new": "New comment on your post",
  "community.post.new": "New community post",
};
function notifTitle(n: NotifItem) {
  return n.payload?.title ?? TYPE_TITLES[n.type] ?? n.type;
}

export default function NotificationsBell() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function loadAndOpen() {
    setUnread(0);
    setOpen(true);
    fetch("/api/notifications", { method: "PATCH", credentials: "include" }).catch(() => null);
    try {
      const r = await fetch("/api/notifications", { cache: "no-store", credentials: "include" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items ?? []);
    } catch {}
  }

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => (open ? setOpen(false) : loadAndOpen())}
        style={{ position: "relative", background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "8px 10px", color: unread > 0 ? "#8B7355" : "#B0AAA2" }}
      >
        🔔
        {unread > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, background: "#8B7355", color: "#FFF", fontSize: 9, fontWeight: 600, minWidth: 14, height: 14, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, width: 300, maxHeight: 360, overflowY: "auto", background: "#FFFFFF", border: "1px solid #E8E3DB", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", zIndex: 100 }}>
          {items.length === 0 ? (
            <div style={{ padding: "24px 18px", textAlign: "center", color: "#B0AAA2", fontFamily: F, fontSize: 12 }}>알림 없음</div>
          ) : items.map((n) => (
            <div key={n.id} style={{ padding: "12px 16px", borderBottom: "1px solid #F0EBE3" }}>
              <p style={{ fontFamily: F, fontSize: 12, color: "#1A1A1A", marginBottom: 4 }}>{notifTitle(n)}</p>
              <span style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2" }}>{new Date(n.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
