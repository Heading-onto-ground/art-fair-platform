/** Gallery Discovery stays off until an operator turns it on. There is no per-user allowlist yet. */
export function isProDiscoveryEnabled(): boolean {
  const raw = process.env.ROB_PRO_DISCOVERY_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
