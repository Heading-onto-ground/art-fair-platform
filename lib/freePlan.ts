export const FREE_PLAN_LIMITS = {
  maxPortfolioUploadBytes: 10 * 1024 * 1024,
  maxPortfolioUploadsPerDay: 10,
  maxSeriesPerArtist: 30,
  maxArtEventsPerArtist: 200,
  maxSelfExhibitionsPerArtist: 50,
} as const;

export type FreePlanLimitKey = keyof typeof FREE_PLAN_LIMITS;
