import { describe, expect, it } from "vitest";
import { rankSearchRows, searchProbe } from "@/lib/history/searchMatch";

const lee = {
  canonicalName: "Lee Ufan",
  nativeName: "이우환",
  aliases: [{ label: "Lee U-Fan" }, { label: "Lee U Fan" }],
};
const youn = {
  canonicalName: "Youn Myeungro",
  nativeName: "윤명로",
  aliases: [] as { label: string }[],
};

describe("search matching", () => {
  it("keeps exact alias matches and rejects a different spelling", () => {
    expect(rankSearchRows([lee, youn], "Lee U-Fan").map((row) => row.canonicalName)).toEqual(["Lee Ufan"]);
    expect(rankSearchRows([lee, youn], "이우환").map((row) => row.canonicalName)).toEqual(["Lee Ufan"]);
    expect(rankSearchRows([lee, youn], "Youn Myeung-Ro")).toEqual([]);
    expect(rankSearchRows([youn], "Youn Myeungro").map((row) => row.canonicalName)).toEqual(["Youn Myeungro"]);
  });

  it("ranks an exact name ahead of a prefix", () => {
    const other = { canonicalName: "Lee Ufan Studio", nativeName: null, aliases: [] as { label: string }[] };
    expect(rankSearchRows([other, lee], "Lee Ufan").map((row) => row.canonicalName)).toEqual(["Lee Ufan", "Lee Ufan Studio"]);
  });

  it("probes with the longest normalized token", () => {
    expect(searchProbe("Lee U-Fan")).toBe("fan");
    expect(searchProbe("박서보")).toBe("박서보");
  });
});
