import { describe, expect, it } from "vitest";
import { coverScale } from "@/lib/imageCrop";

describe("coverScale", () => {
  it("covers viewport when image is wider than tall", () => {
    expect(coverScale(2000, 1000, 400, 400)).toBe(0.4);
  });

  it("covers viewport when image is taller than wide", () => {
    expect(coverScale(1000, 2000, 400, 400)).toBe(0.4);
  });
});
