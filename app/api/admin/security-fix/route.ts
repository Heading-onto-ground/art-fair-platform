import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type CountRow = { count: bigint | number | string };

async function countRlsDisabledTables() {
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::bigint AS count
    FROM pg_tables t
    JOIN pg_class c ON c.relname = t.tablename
    JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
    WHERE t.schemaname = 'public'
      AND t.tablename <> '_prisma_migrations'
      AND c.relkind = 'r'
      AND c.relrowsecurity = false
  `)) as CountRow[];
  return Number(rows?.[0]?.count ?? 0);
}

async function countApiTableGrants() {
  const rows = (await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::bigint AS count
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
  `)) as CountRow[];
  return Number(rows?.[0]?.count ?? 0);
}

async function runSecurityHardening() {
  // 1) Enable RLS for all public tables (except prisma migration metadata).
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> '_prisma_migrations'
      LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
      END LOOP;
    END $$;
  `);

  // 2) Revoke broad table-level privileges from API roles.
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
      LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', r.tablename);
      END LOOP;
    END $$;
  `);

  // 3) Revoke sequence usage too, to avoid insert/id leaks through defaults.
  await prisma.$executeRawUnsafe(`
    DO $$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
      LOOP
        EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated;', r.sequence_name);
      END LOOP;
    END $$;
  `);
}

export async function POST() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const before = {
      rlsDisabledTables: await countRlsDisabledTables(),
      apiTableGrants: await countApiTableGrants(),
    };

    await runSecurityHardening();

    const after = {
      rlsDisabledTables: await countRlsDisabledTables(),
      apiTableGrants: await countApiTableGrants(),
    };

    return NextResponse.json(
      {
        ok: true,
        message: "Security hardening completed for public schema.",
        before,
        after,
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("POST /api/admin/security-fix failed:", e);
    return NextResponse.json({ error: "security fix failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const admin = getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const status = {
      rlsDisabledTables: await countRlsDisabledTables(),
      apiTableGrants: await countApiTableGrants(),
    };
    return NextResponse.json({ ok: true, status }, { status: 200 });
  } catch (e) {
    console.error("GET /api/admin/security-fix failed:", e);
    return NextResponse.json({ error: "status check failed" }, { status: 500 });
  }
}

