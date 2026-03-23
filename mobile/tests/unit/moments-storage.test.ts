/**
 * Unit tests for moments storage (AsyncStorage wrapper).
 * Foundation for QA AI / RCA AI agent.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMoments, saveMoment, appendMoment, clearMoments } from "@/services/storage/moments";
import type { ArtistMoment } from "@/types";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

const mockGet = vi.mocked(AsyncStorage.getItem);
const mockSet = vi.mocked(AsyncStorage.setItem);
const mockRemove = vi.mocked(AsyncStorage.removeItem);

const sampleMoment: ArtistMoment = {
  id: "m1",
  artistId: "a1",
  artistName: "Artist",
  imageUri: "https://example.com/img.jpg",
  state: "working",
  medium: "painting",
  createdAt: "2025-03-16T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getMoments", () => {
  it("returns empty array when storage is empty", async () => {
    mockGet.mockResolvedValue(null);
    expect(await getMoments()).toEqual([]);
  });

  it("returns parsed moments when storage has data", async () => {
    mockGet.mockResolvedValue(JSON.stringify([sampleMoment]));
    const result = await getMoments();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(sampleMoment);
  });

  it("returns empty array on parse error", async () => {
    mockGet.mockResolvedValue("invalid json");
    expect(await getMoments()).toEqual([]);
  });

  it("returns empty array when stored value is not an array", async () => {
    mockGet.mockResolvedValue(JSON.stringify({ foo: "bar" }));
    expect(await getMoments()).toEqual([]);
  });
});

describe("saveMoment", () => {
  it("prepends new moment to existing list", async () => {
    mockGet.mockResolvedValue(JSON.stringify([sampleMoment]));
    const newMoment: ArtistMoment = {
      ...sampleMoment,
      id: "m2",
      createdAt: "2025-03-17T10:00:00Z",
    };
    await saveMoment(newMoment);
    expect(mockSet).toHaveBeenCalledWith(
      "@rob_artist_moments",
      JSON.stringify([newMoment, sampleMoment])
    );
  });

  it("saves single moment when storage was empty", async () => {
    mockGet.mockResolvedValue(null);
    await saveMoment(sampleMoment);
    expect(mockSet).toHaveBeenCalledWith(
      "@rob_artist_moments",
      JSON.stringify([sampleMoment])
    );
  });
});

describe("appendMoment", () => {
  it("delegates to saveMoment", async () => {
    mockGet.mockResolvedValue(null);
    await appendMoment(sampleMoment);
    expect(mockSet).toHaveBeenCalled();
  });
});

describe("clearMoments", () => {
  it("removes storage key", async () => {
    await clearMoments();
    expect(mockRemove).toHaveBeenCalledWith("@rob_artist_moments");
  });
});
