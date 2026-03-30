// NOTE: In-memory rate limiting — works within a single Node.js process instance.
// On Vercel serverless, each cold start resets counters. This still provides
// meaningful protection for warm instances but is not guaranteed across all requests.
// For stricter enforcement, replace with a persistent store (e.g. Upstash Redis).

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();

export function consumeRateLimit(input: {
  key: string;
  max: number;
  windowMs: number;
}) {
  const now = Date.now();
  const prev = memoryBuckets.get(input.key);
  if (!prev || now >= prev.resetAt) {
    const resetAt = now + input.windowMs;
    memoryBuckets.set(input.key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(0, input.max - 1), resetAt };
  }
  if (prev.count >= input.max) {
    return { allowed: false, remaining: 0, resetAt: prev.resetAt };
  }
  prev.count += 1;
  memoryBuckets.set(input.key, prev);
  return { allowed: true, remaining: Math.max(0, input.max - prev.count), resetAt: prev.resetAt };
}

export function clearRateLimit(key: string) {
  memoryBuckets.delete(key);
}

export function getClientIp(req: Request) {
  const forwarded = String(req.headers.get("x-forwarded-for") || "");
  if (forwarded) return forwarded.split(",")[0].trim();
  return String(req.headers.get("x-real-ip") || "unknown").trim() || "unknown";
}

