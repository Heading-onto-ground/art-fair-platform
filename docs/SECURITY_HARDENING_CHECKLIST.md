# Security Hardening Checklist

This checklist is for post-incident hardening and recurring security hygiene.

## Immediate Rotation and Access

- Rotate `DATABASE_URL` credentials and redeploy.
- Rotate `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_PASSWORD`, and `RESEND_API_KEY`.
- Remove or rotate any exposed credentials from chat, screenshots, or logs.
- Revoke unused Vercel tokens, GitHub tokens, and third-party integrations.
- Enforce least privilege for production project access.

## Required Environment Variables (Production)

- `DATABASE_URL`
- `SESSION_SECRET` (32+ random chars)
- `CRON_SECRET` (32+ random chars)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (or DB-backed admin password hash)
- `NEXT_PUBLIC_APP_URL`

## API and Admin Hardening

- Keep admin login rate limiting enabled.
- Keep admin reset-password endpoint rate limiting enabled.
- Disable `ADMIN_RESET_TOKEN` except for emergency recovery windows.
- Require `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret` for cron endpoints.
- Avoid exposing operational errors to clients; log detailed errors server-side only.

## HTTP Security Headers

Ensure responses include:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Strict-Transport-Security` in production

## Supabase/Postgres Hardening

- Enable RLS for public-facing tables.
- Remove unnecessary `anon/authenticated` table grants.
- Restrict function execution permissions for non-admin roles.
- Periodically review Security Advisor warnings and resolve high severity findings.

## Monitoring and Verification

- Track spikes in `401`, `403`, `429`, and `500` responses on admin and auth routes.
- Alert on repeated failed admin login/reset attempts.
- Alert on unusual cron invocation frequency.
- Review Vercel + Supabase audit/activity logs for suspicious changes.

## Recurring Cadence

- Weekly: review activity logs and access list.
- Monthly: rotate high-impact keys/tokens.
- Quarterly: run incident response dry run and backup restore drill.

