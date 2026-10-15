import { describe, expect, it } from "vitest";
import { frontierStatus, resolveVerifiedSpace } from "@/lib/history/growth";

describe("frontier status", () => {
  it("keeps an unverified comma spelling unresolved", () => {
    expect(frontierStatus({})).toBe("UNRESOLVED_IDENTITY");
  });

  it("advances only as far as the evidence allows", () => {
    expect(frontierStatus({ identityVerified: true })).toBe("IDENTITY_VERIFIED");
    expect(frontierStatus({ identityVerified: true, sourceFound: true })).toBe("SOURCE_DISCOVERY");
    expect(frontierStatus({ identityVerified: true, sourceFound: true, candidatesReady: true })).toBe("CANDIDATES_READY");
    expect(frontierStatus({ imported: true, candidatesReady: true })).toBe("IMPORTED");
    expect(frontierStatus({ noGo: true, imported: true })).toBe("NO_GO");
  });

  it("accepts the explicit Powerlong Museum alias and rejects an unverified Kukje branch name", () => {
    expect(resolveVerifiedSpace("Powerlong Museum")?.slug).toBe("powerlong-art-museum");
    expect(resolveVerifiedSpace("Kukje Gallery Seoul")).toBeNull();
  });
});
