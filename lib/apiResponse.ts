// ──────────────────────────────────────────
// Standardized API Response Helpers
// Consistent error/success shapes across all routes
// ──────────────────────────────────────────

import { NextResponse } from "next/server";

type ErrorBody = {
  error: string;
  details?: string;
};

/** 200 success */
export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/** 400 bad request */
export function apiBadRequest(message: string) {
  return NextResponse.json({ error: message } satisfies ErrorBody, { status: 400 });
}

/** 401 unauthorized */
export function apiUnauthorized(message = "unauthorized") {
  return NextResponse.json({ error: message } satisfies ErrorBody, { status: 401 });
}

/** 403 forbidden */
export function apiForbidden(message = "forbidden") {
  return NextResponse.json({ error: message } satisfies ErrorBody, { status: 403 });
}

/** 404 not found */
export function apiNotFound(message = "not found") {
  return NextResponse.json({ error: message } satisfies ErrorBody, { status: 404 });
}

/** 500 server error — logs the error, returns safe message */
export function apiServerError(context: string, error: unknown) {
  console.error(`${context}:`, error);
  const details =
    process.env.NODE_ENV !== "production" && error instanceof Error
      ? error.message
      : undefined;
  return NextResponse.json(
    { error: "server error", ...(details ? { details } : {}) } satisfies ErrorBody,
    { status: 500 }
  );
}
