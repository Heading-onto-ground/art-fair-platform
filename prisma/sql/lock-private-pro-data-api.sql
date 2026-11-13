-- Lock private Pro tables against the Supabase Data API.
-- These five tables were created after the earlier __afp_deny_api_roles pass,
-- so they had grants removed but row security was still off.
-- Apply only after a verified PostgreSQL backup.
--
-- This enables row security and adds the existing deny-all policy for the
-- anon and authenticated API roles. It does not FORCE row security.
-- The postgres role used by Prisma has BYPASSRLS, so server queries continue.
-- service_role is left unchanged for the Supabase dashboard secret key.
-- No columns, rows, or table names are changed. No DROP, TRUNCATE, or DELETE.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ArtistWatch',
    'SavedDiscoverySearch',
    'ArtistShortlist',
    'PrivateArtistNote',
    'ActivityAlert'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated, PUBLIC', t);
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
        AND policyname = '__afp_deny_api_roles'
    ) THEN
      EXECUTE format(
        'CREATE POLICY "__afp_deny_api_roles" ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
        t
      );
    END IF;
  END LOOP;
END $$;
