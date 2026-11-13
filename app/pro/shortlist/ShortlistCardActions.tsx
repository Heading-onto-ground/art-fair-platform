"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { trackHistory } from "@/lib/history/analytics";
import { SHORTLIST_STATUSES, STATUS_LABELS, type ShortlistStatus } from "@/lib/pro/shortlistStatus";

export default function ShortlistCardActions({
  artistEntityId,
  slug,
  status,
  noteBody,
}: {
  artistEntityId: string;
  slug: string | null;
  status: ShortlistStatus;
  noteBody: string | null;
}) {
  const router = useRouter();
  const statusId = useId();
  const noteId = useId();
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const path = slug ? `/artists/${slug}` : "/pro/shortlist";
  const [current, setCurrent] = useState(status);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(noteBody ?? "");
  const [hasNote, setHasNote] = useState(Boolean(noteBody));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editing) noteRef.current?.focus();
  }, [editing]);

  async function changeStatus(next: ShortlistStatus) {
    const previous = current;
    setCurrent(next);
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/pro/shortlist/${encodeURIComponent(artistEntityId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        setCurrent(previous);
        setError("상태를 바꾸지 못했습니다.");
        return;
      }
      trackHistory("PRO_SHORTLIST_STATUS_CHANGED", path);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function saveNote() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/pro/notes/${encodeURIComponent(artistEntityId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (payload?.error === "empty_body") setError("노트를 입력한 뒤 저장해 주세요.");
        else if (payload?.error === "body_too_long") setError("노트는 5,000자까지 저장할 수 있습니다.");
        else setError("노트를 저장하지 못했습니다.");
        return;
      }
      const payload = (await response.json()) as { created?: boolean };
      setHasNote(true);
      setDraft(draft.trim());
      trackHistory(payload.created ? "PRO_PRIVATE_NOTE_CREATED" : "PRO_PRIVATE_NOTE_UPDATED", path);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function deleteNote() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/pro/notes/${encodeURIComponent(artistEntityId)}`, { method: "DELETE" });
      if (!response.ok) {
        setError("노트를 삭제하지 못했습니다.");
        return;
      }
      setHasNote(false);
      setDraft("");
      setEditing(false);
      trackHistory("PRO_PRIVATE_NOTE_DELETED", path);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function removeRow() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/pro/shortlist/${encodeURIComponent(artistEntityId)}`, { method: "DELETE" });
      if (!response.ok) {
        setError("숏리스트에서 빼지 못했습니다.");
        return;
      }
      trackHistory("PRO_SHORTLIST_REMOVED", path);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="pd-shortlist-controls">
      <label className="pd-status" htmlFor={statusId}>
        상태
        <select
          id={statusId}
          value={current}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value as ShortlistStatus;
            if (SHORTLIST_STATUSES.includes(next)) void changeStatus(next);
          }}
        >
          {SHORTLIST_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </label>
      {editing ? (
        <div className="pd-note-editor">
          <label htmlFor={noteId}>비공개 메모</label>
          <textarea id={noteId} ref={noteRef} value={draft} maxLength={5000} rows={6} onChange={(event) => setDraft(event.target.value)} />
          <div className="pd-card-actions">
            <button type="button" className="pd-shortlist" disabled={pending} onClick={() => void saveNote()}>
              저장
            </button>
            {hasNote ? (
              <button type="button" className="pd-shortlist" disabled={pending} onClick={() => void deleteNote()}>
                노트 삭제
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="pd-card-actions">
          <button type="button" className="pd-shortlist" disabled={pending} onClick={() => setEditing(true)}>
            노트 편집
          </button>
        </div>
      )}
      <div className="pd-card-actions">
        <button type="button" className="pd-shortlist" disabled={pending} onClick={() => void removeRow()}>
          숏리스트에서 빼기
        </button>
      </div>
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
