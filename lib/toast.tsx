"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { F, colors } from "@/lib/design";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms, 0 = persistent
};

type ToastContextValue = {
  toasts: Toast[];
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
};

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info", duration = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, type, duration }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const success = useCallback((msg: string, dur?: number) => toast(msg, "success", dur), [toast]);
  const error = useCallback((msg: string, dur?: number) => toast(msg, "error", dur ?? 5000), [toast]);
  const info = useCallback((msg: string, dur?: number) => toast(msg, "info", dur), [toast]);
  const warning = useCallback((msg: string, dur?: number) => toast(msg, "warning", dur), [toast]);

  return (
    <ToastContext.Provider value={{ toasts, toast, success, error, info, warning, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─────────────────────────────────────────────
// Toast 아이콘
// ─────────────────────────────────────────────

const ICONS: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "!",
  info: "·",
};

const TYPE_COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: "#F6FAF6",
    border: "rgba(90,122,90,0.25)",
    icon: colors.success,
    text: colors.textPrimary,
  },
  error: {
    bg: "#FAF4F4",
    border: "rgba(139,74,74,0.25)",
    icon: colors.error,
    text: colors.textPrimary,
  },
  warning: {
    bg: "#FAF8F0",
    border: "rgba(154,138,90,0.25)",
    icon: colors.warning,
    text: colors.textPrimary,
  },
  info: {
    bg: colors.bgCard,
    border: colors.border,
    icon: colors.accent,
    text: colors.textPrimary,
  },
};

// ─────────────────────────────────────────────
// 개별 Toast 아이템
// ─────────────────────────────────────────────

function ToastItem({ toast, dismiss }: { toast: Toast; dismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const c = TYPE_COLORS[toast.type];

  useEffect(() => {
    // mount 후 fade-in
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => dismiss(toast.id), 200);
  }

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={handleDismiss}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "14px 16px",
        background: c.bg,
        border: `1px solid ${c.border}`,
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.2s ease, transform 0.2s ease",
        maxWidth: 360,
        minWidth: 240,
        pointerEvents: "auto",
      }}
    >
      {/* 아이콘 */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: c.icon,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: F,
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {ICONS[toast.type]}
      </div>

      {/* 메시지 */}
      <span
        style={{
          fontFamily: F,
          fontSize: 13,
          color: c.text,
          lineHeight: 1.5,
          flex: 1,
        }}
      >
        {toast.message}
      </span>

      {/* 닫기 */}
      <button
        onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
        aria-label="Dismiss"
        style={{
          background: "none",
          border: "none",
          color: colors.textLight,
          fontSize: 14,
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
          letterSpacing: 0,
          textTransform: "none",
          fontWeight: 400,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Toast 컨테이너 (화면 우하단 고정)
// ─────────────────────────────────────────────

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="assertive"
      aria-atomic="false"
      style={{
        position: "fixed",
        bottom: 28,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} dismiss={dismiss} />
      ))}
    </div>
  );
}
