import { describe, expect, it } from "vitest";
import { journeyDepthFromCounts } from "@/lib/history/analytics";
import { namedFrontier, statusForFrontierCase } from "@/lib/history/frontierCases";

describe("history operations report", () => {
  it("keeps a comma spelling unresolved and a verified identity unimported until a record exists", () => {
    const rows = namedFrontier([{ slug: "youn-myeungro", exhibitionCount: 1 }]);
    expect(rows.find((row) => row.name === "Kim, Guirin")?.status).toBe("UNRESOLVED_IDENTITY");
    expect(rows.find((row) => row.name === "Kim Hyung Dae")?.status).toBe("SOURCE_DISCOVERY");
    expect(rows.find((row) => row.name === "Youn Myeungro")?.status).toBe("IMPORTED");
    expect(rows.find((row) => row.name === "Lee Seung Jio")?.status).toBe("IDENTITY_VERIFIED");
    expect(rows.find((row) => row.name === "Park Hyun-Ki")?.status).toBe("IDENTITY_VERIFIED");
    expect(statusForFrontierCase(
      { verified: true },
      { entityExists: true, recordCount: 2 },
    )).toBe("IMPORTED");
  });

  it("reports journey depth from event counts without a visitor id", () => {
    const report = journeyDepthFromCounts({ opened: 4, second: 2, third: 1, fourth: 0 });
    expect(report.oneArtist).toBe(4);
    expect(report.twoArtists).toBe(2);
    expect(report.openedToSecond).toBe(0.5);
    expect(report.secondToThird).toBe(0.5);
    expect(report.thirdToFourth).toBe(0);
    expect(journeyDepthFromCounts({ opened: 0, second: 0, third: 0, fourth: 0 }).openedToSecond).toBeNull();
  });
});
