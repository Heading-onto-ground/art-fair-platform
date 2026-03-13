"use client";

import { useState, useEffect, useCallback } from "react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

type SpaceOption = { id: string; name: string; city?: string | null; country?: string | null };
type ArtistOption = { id: string; artistId: string; name: string; city?: string | null; country?: string | null };

export default function AddExhibitionModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [venueSuggestions, setVenueSuggestions] = useState<SpaceOption[]>([]);
  const [venueOpen, setVenueOpen] = useState(false);
  const [curator, setCurator] = useState("");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [collaboratorNames, setCollaboratorNames] = useState<Record<string, string>>({});
  const [collabInput, setCollabInput] = useState("");
  const [artistSuggestions, setArtistSuggestions] = useState<ArtistOption[]>([]);
  const [artistOpen, setArtistOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpaces = useCallback(async (q: string) => {
    if (q.length < 2) return [];
    const res = await fetch(`/api/spaces?q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    return (data.spaces ?? []).map((s: { id?: string; name: string; city?: string | null; country?: string | null }) => ({
      id: s.id || "",
      name: s.name,
      city: s.city,
      country: s.country,
    }));
  }, []);

  const fetchArtists = useCallback(async (q: string) => {
    if (q.length < 2) return [];
    const res = await fetch(`/api/artists/search?q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    return data.artists ?? [];
  }, []);

  useEffect(() => {
    if (venue.length >= 2) {
      fetchSpaces(venue).then((s) => {
        setVenueSuggestions(s);
        setVenueOpen(true);
      });
    } else {
      setVenueSuggestions([]);
      setVenueOpen(false);
    }
  }, [venue, fetchSpaces]);

  useEffect(() => {
    if (collabInput.length >= 2) {
      fetchArtists(collabInput).then((a) => {
        setArtistSuggestions(a.filter((x: ArtistOption) => !collaboratorIds.includes(x.id)));
        setArtistOpen(true);
      });
    } else {
      setArtistSuggestions([]);
      setArtistOpen(false);
    }
  }, [collabInput, collaboratorIds, fetchArtists]);

  const addCollaborator = (artist: ArtistOption) => {
    if (!collaboratorIds.includes(artist.id)) {
      setCollaboratorIds([...collaboratorIds, artist.id]);
      setCollaboratorNames({ ...collaboratorNames, [artist.id]: artist.name });
      setCollabInput("");
      setArtistOpen(false);
    }
  };

  const removeCollaborator = (id: string) => {
    setCollaboratorIds(collaboratorIds.filter((x) => x !== id));
    const next = { ...collaboratorNames };
    delete next[id];
    setCollaboratorNames(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Exhibition title is required.");
      return;
    }
    if (!startDate) {
      setError("Start date is required.");
      return;
    }
    if (!venue.trim()) {
      setError("Venue is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/artist/self-exhibitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          city: venue.trim(),
          country: "",
          spaceName: venue.trim(),
          curatorName: curator.trim() || undefined,
          collaboratorArtistIds: collaboratorIds,
          isPublic: true,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to save");
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">Add Past Exhibition</h2>
          <button
            onClick={onClose}
            className="p-2 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F8F9FA] rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Exhibition Title <span className="text-[#0066FF]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Spatial Echo 2025"
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                Start Date <span className="text-[#0066FF]">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none"
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Venue / Space <span className="text-[#0066FF]">*</span>
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              onBlur={() => setTimeout(() => setVenueOpen(false), 150)}
              placeholder="Search or type venue name (e.g. Seoul)"
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none"
            />
            {venueOpen && venueSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {venueSuggestions.map((s) => (
                  <li
                    key={s.id || s.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setVenue(s.name);
                      setVenueSuggestions([]);
                      setVenueOpen(false);
                    }}
                    className="px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8F9FA] cursor-pointer"
                  >
                    {s.name}
                    {(s.city || s.country) && (
                      <span className="text-[#6B7280] ml-2">
                        {[s.city, s.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Collaborating Artists
            </label>
            <p className="text-xs text-[#6B7280] mb-2">
              ROB 내 작가 검색 · 함께 전시한 작가를 태그하면 Network에 연결돼요
            </p>
            <input
              type="text"
              value={collabInput}
              onChange={(e) => setCollabInput(e.target.value)}
              onBlur={() => setTimeout(() => setArtistOpen(false), 150)}
              placeholder="Search artist name"
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none mb-2"
            />
            {artistOpen && artistSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-32 overflow-y-auto">
                {artistSuggestions.map((a) => (
                  <li
                    key={a.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addCollaborator(a)}
                    className="px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8F9FA] cursor-pointer"
                  >
                    {a.name}
                    {(a.city || a.country) && (
                      <span className="text-[#6B7280] ml-2">
                        {[a.city, a.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {collaboratorIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {collaboratorIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#0066FF]/10 text-[#0066FF] rounded-full text-sm"
                  >
                    {collaboratorNames[id] ?? id}
                    <button
                      type="button"
                      onClick={() => removeCollaborator(id)}
                      className="text-[#0066FF] hover:text-[#0052CC]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {collaboratorIds.length === 0 && (
              <p className="mt-1 text-xs text-[#9CA3AF]">
                참여 작가를 추가하면 Collaborated with 섹션이 채워져요
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Curator (optional)
            </label>
            <input
              type="text"
              value={curator}
              onChange={(e) => setCurator(e.target.value)}
              placeholder="Curator name"
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#E5E7EB] rounded-lg font-medium text-[#1A1A1A] hover:bg-[#F8F9FA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-[#0066FF] hover:bg-[#0052CC] text-white font-medium rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Exhibition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
