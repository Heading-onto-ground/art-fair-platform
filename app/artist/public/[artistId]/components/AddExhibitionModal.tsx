"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function AddExhibitionModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [venue, setVenue] = useState("");
  const [venueSuggestions, setVenueSuggestions] = useState<string[]>([]);
  const [curator, setCurator] = useState("");
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collabInput, setCollabInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Placeholder: venue autocomplete (would call /api/spaces)
  const handleVenueChange = (v: string) => {
    setVenue(v);
    if (v.length >= 2) {
      setVenueSuggestions([
        "Independent Space Seoul",
        "Gallery Hyundai",
        "Kukje Gallery",
        "National Museum of Modern and Contemporary Art",
      ].filter((s) => s.toLowerCase().includes(v.toLowerCase())));
    } else {
      setVenueSuggestions([]);
    }
  };

  const addCollaborator = () => {
    const t = collabInput.trim();
    if (t && !collaborators.includes(t)) {
      setCollaborators([...collaborators, t]);
      setCollabInput("");
    }
  };

  const removeCollaborator = (c: string) => {
    setCollaborators(collaborators.filter((x) => x !== c));
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
          description: collaborators.length > 0 ? `With: ${collaborators.join(", ")}` : undefined,
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
              placeholder="e.g. Spatial Echo"
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
              onChange={(e) => handleVenueChange(e.target.value)}
              placeholder="Search or type venue name"
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-lg focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none"
            />
            {venueSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {venueSuggestions.map((s) => (
                  <li
                    key={s}
                    onClick={() => {
                      setVenue(s);
                      setVenueSuggestions([]);
                    }}
                    className="px-4 py-2 text-sm text-[#1A1A1A] hover:bg-[#F8F9FA] cursor-pointer"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A1A1A] mb-1">
              Collaborating Artists
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={collabInput}
                onChange={(e) => setCollabInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCollaborator())}
                placeholder="Add artist name"
                className="flex-1 px-4 py-3 border border-[#E5E7EB] rounded-lg focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20 outline-none"
              />
              <button
                type="button"
                onClick={addCollaborator}
                className="px-4 py-3 border border-[#E5E7EB] rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#F8F9FA]"
              >
                Add
              </button>
            </div>
            {collaborators.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {collaborators.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#0066FF]/10 text-[#0066FF] rounded-full text-sm"
                  >
                    {c}
                    <button
                      type="button"
                      onClick={() => removeCollaborator(c)}
                      className="text-[#0066FF] hover:text-[#0052CC]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-[#6B7280]">+ Add from ROB network (coming soon)</p>
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
