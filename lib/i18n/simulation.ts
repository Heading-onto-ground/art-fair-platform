type SimulationEnv = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  ROB_LOCALE_SIMULATION?: string;
};

/**
 * Country simulation is a local and preview debugging switch.
 * A production deployment ignores rob_country_sim even if the flag is present.
 */
export function localeSimulationEnabled(env: SimulationEnv = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.NODE_ENV === "production" && env.VERCEL_ENV !== "preview") return false;
  return env.ROB_LOCALE_SIMULATION === "1";
}
