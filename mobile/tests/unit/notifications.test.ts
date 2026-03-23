/**
 * Unit tests for notification preference logic (AsyncStorage).
 * Foundation for QA AI agent.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockSet = vi.fn();

vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  scheduleNotificationAsync: vi.fn(),
  cancelAllScheduledNotificationsAsync: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (key: string) => mockGet(key),
    setItem: (key: string, value: string) => mockSet(key, value),
  },
}));

import {
  getNotificationPreference,
  saveNotificationPreference,
} from "@/services/notifications";

beforeEach(() => {
  mockGet.mockClear();
  mockSet.mockClear();
});

describe("getNotificationPreference", () => {
  it("returns true when stored value is 'true'", async () => {
    mockGet.mockResolvedValue("true");
    expect(await getNotificationPreference()).toBe(true);
  });

  it("returns false when stored value is 'false'", async () => {
    mockGet.mockResolvedValue("false");
    expect(await getNotificationPreference()).toBe(false);
  });

  it("returns false when storage is empty (v !== 'true')", async () => {
    mockGet.mockResolvedValue(null);
    expect(await getNotificationPreference()).toBe(false);
  });

  it("returns true (default) on storage error", async () => {
    mockGet.mockRejectedValue(new Error("Storage error"));
    expect(await getNotificationPreference()).toBe(true);
  });
});

describe("saveNotificationPreference", () => {
  it("stores 'true' when enabled", async () => {
    await saveNotificationPreference(true);
    expect(mockSet).toHaveBeenCalledWith("@rob_notification_enabled", "true");
  });

  it("stores 'false' when disabled", async () => {
    await saveNotificationPreference(false);
    expect(mockSet).toHaveBeenCalledWith("@rob_notification_enabled", "false");
  });
});
