import { describe, expect, it } from "vitest";
import {
  MAX_PROFILE_IMAGE_DATA_URI_LENGTH,
  validateProfileImageInput,
} from "../lib/profileImageValidation";

describe("validateProfileImageInput", () => {
  it("accepts null and empty", () => {
    expect(validateProfileImageInput(null)).toEqual({ ok: true, value: null });
    expect(validateProfileImageInput("")).toEqual({ ok: true, value: null });
  });

  it("accepts https URLs", () => {
    const url = "https://blob.vercel-storage.com/profile.jpg";
    expect(validateProfileImageInput(url)).toEqual({ ok: true, value: url });
  });

  it("rejects oversized data URIs", () => {
    const huge = "data:image/jpeg;base64," + "a".repeat(MAX_PROFILE_IMAGE_DATA_URI_LENGTH);
    const result = validateProfileImageInput(huge);
    expect(result.ok).toBe(false);
  });

  it("rejects non-image data URIs", () => {
    expect(validateProfileImageInput("data:text/plain,hi").ok).toBe(false);
  });
});
