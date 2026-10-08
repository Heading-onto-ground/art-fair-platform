export type PilotColor = "GREEN" | "YELLOW" | "RED";

export type SourceSignals = {
  robotsAccess: "ALLOWED" | "DISALLOWED" | "NO_ROBOTS" | "UNREADABLE";
  officialInterface: "NONE" | "OPEN" | "OPEN_KEY_REQUIRED" | "DISALLOWED";
  structuredDataLicense: "CC0" | "EXPLICIT_OPEN" | "PER_ITEM" | "UNSPECIFIED" | "INCOMPATIBLE" | "NONE";
  explicitReuseBan: boolean;
  accessBarrier: "NONE" | "AUTH" | "PAYWALL" | "CAPTCHA";
};

export type ManualResearchStatus = "ELIGIBLE" | "REVIEW_REQUIRED" | "INELIGIBLE";

export type ClassifiedSource = {
  automationStatus: string;
  reuseStatus: string;
  finalPilotStatus: PilotColor;
  reason: string;
};

export function classifyManualResearch(
  input: SourceSignals & { officialExhibitionPage: boolean },
): ManualResearchStatus {
  if (input.accessBarrier !== "NONE") return "INELIGIBLE";
  if (
    input.robotsAccess === "DISALLOWED" ||
    input.robotsAccess === "UNREADABLE" ||
    input.officialInterface === "DISALLOWED"
  ) {
    return "INELIGIBLE";
  }
  if (!input.officialExhibitionPage) return "INELIGIBLE";
  if (input.explicitReuseBan || input.structuredDataLicense === "INCOMPATIBLE") return "REVIEW_REQUIRED";
  return "ELIGIBLE";
}

export function classifySource(input: SourceSignals): ClassifiedSource {
  const reuseStatus = input.explicitReuseBan ? "INCOMPATIBLE" : input.structuredDataLicense;
  if (input.accessBarrier !== "NONE") {
    return {
      automationStatus: "BLOCKED",
      reuseStatus,
      finalPilotStatus: "RED",
      reason: `access_barrier_${input.accessBarrier.toLowerCase()}`,
    };
  }

  const openLicense =
    input.structuredDataLicense === "CC0" || input.structuredDataLicense === "EXPLICIT_OPEN";
  const officialOpen =
    input.officialInterface === "OPEN" || input.officialInterface === "OPEN_KEY_REQUIRED";
  if (officialOpen && openLicense && !input.explicitReuseBan) {
    return {
      automationStatus:
        input.officialInterface === "OPEN_KEY_REQUIRED"
          ? "OFFICIAL_API_KEY_REQUIRED"
          : "OFFICIAL_PROGRAMMATIC_ACCESS",
      reuseStatus,
      finalPilotStatus: "GREEN",
      reason: "official_open_interface",
    };
  }

  if (input.explicitReuseBan || input.structuredDataLicense === "INCOMPATIBLE") {
    return {
      automationStatus: input.robotsAccess === "DISALLOWED" ? "ROBOTS_DISALLOW" : "REUSE_BLOCKED",
      reuseStatus: "INCOMPATIBLE",
      finalPilotStatus: "RED",
      reason: "explicit_reuse_restriction",
    };
  }

  if (input.robotsAccess === "DISALLOWED" || input.officialInterface === "DISALLOWED") {
    return {
      automationStatus: "ROBOTS_DISALLOW",
      reuseStatus,
      finalPilotStatus: "RED",
      reason: "automated_access_disallowed",
    };
  }

  if (input.robotsAccess === "UNREADABLE") {
    return {
      automationStatus: "ROBOTS_UNREADABLE",
      reuseStatus,
      finalPilotStatus: "RED",
      reason: "robots_not_confirmed",
    };
  }

  return {
    automationStatus: "PUBLIC_PAGE",
    reuseStatus: reuseStatus === "NONE" ? "UNSPECIFIED" : reuseStatus,
    finalPilotStatus: "YELLOW",
    reason:
      input.structuredDataLicense === "PER_ITEM"
        ? "reuse_depends_on_item_mark"
        : "reuse_not_explicit",
  };
}
