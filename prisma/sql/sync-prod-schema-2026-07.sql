-- Run this in Supabase → SQL Editor (same project as the Vercel DATABASE_URL).
--
-- Why: this repo applies prod schema via raw SQL (see create-admin-support-tables.sql),
-- not `prisma migrate`. Several models added since March were never applied to prod,
-- so the deployed Prisma client 500s on any query touching them:
--   * User.isOperator missing            → POST /api/auth/login 500 (login broken)
--   * MomentReaction table missing       → GET /api/artist/moments?recent=true 500
--   * Space/Curator/Exhibition missing   → GET /api/exhibitions 500
--   * Artwork/Hashtag/likes/comments     → Instagram-style artist posts
--   * Gathering/GatheringAttendee        → offline meetup records
--
-- Every statement is idempotent (IF NOT EXISTS / duplicate_object guard),
-- so the whole script is safe to run more than once.

-- ========== User.isOperator (breaks login) ==========

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isOperator" BOOLEAN NOT NULL DEFAULT false;

-- ========== ArtistProfile columns (safety; referenced by tables below) ==========

ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "workNote" TEXT;
ALTER TABLE "ArtistProfile" ADD COLUMN IF NOT EXISTS "profileImage" TEXT;

-- ========== Artist Ritual: ArtistMoment + MomentReaction ==========

CREATE TABLE IF NOT EXISTS "ArtistMoment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "note" TEXT,
    "state" TEXT NOT NULL,
    "medium" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtistMoment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ArtistMoment_userId_idx" ON "ArtistMoment"("userId");
CREATE INDEX IF NOT EXISTS "ArtistMoment_artistId_idx" ON "ArtistMoment"("artistId");
CREATE INDEX IF NOT EXISTS "ArtistMoment_createdAt_idx" ON "ArtistMoment"("createdAt");

CREATE TABLE IF NOT EXISTS "MomentReaction" (
    "id" TEXT NOT NULL,
    "momentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reactionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MomentReaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "MomentReaction_momentId_userId_key" ON "MomentReaction"("momentId", "userId");
CREATE INDEX IF NOT EXISTS "MomentReaction_momentId_idx" ON "MomentReaction"("momentId");
CREATE INDEX IF NOT EXISTS "MomentReaction_userId_idx" ON "MomentReaction"("userId");

DO $$ BEGIN
  ALTER TABLE "MomentReaction"
    ADD CONSTRAINT "MomentReaction_momentId_fkey"
    FOREIGN KEY ("momentId") REFERENCES "ArtistMoment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== Exhibitions: Space / Curator / Exhibition / ExhibitionArtist ==========

CREATE TABLE IF NOT EXISTS "Space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "city" TEXT,
    "country" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Curator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "organization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Curator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Exhibition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "city" TEXT,
    "country" TEXT,
    "description" TEXT,
    "spaceId" TEXT,
    "curatorId" TEXT,
    "createdBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exhibition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Exhibition_createdBy_idx" ON "Exhibition"("createdBy");

DO $$ BEGIN
  ALTER TABLE "Exhibition"
    ADD CONSTRAINT "Exhibition_spaceId_fkey"
    FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Exhibition"
    ADD CONSTRAINT "Exhibition_curatorId_fkey"
    FOREIGN KEY ("curatorId") REFERENCES "Curator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ExhibitionArtist" (
    "id" TEXT NOT NULL,
    "exhibitionId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExhibitionArtist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ExhibitionArtist_exhibitionId_artistId_key" ON "ExhibitionArtist"("exhibitionId", "artistId");
CREATE INDEX IF NOT EXISTS "ExhibitionArtist_artistId_idx" ON "ExhibitionArtist"("artistId");

DO $$ BEGIN
  ALTER TABLE "ExhibitionArtist"
    ADD CONSTRAINT "ExhibitionArtist_exhibitionId_fkey"
    FOREIGN KEY ("exhibitionId") REFERENCES "Exhibition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== Instagram-style posts: Artwork + Hashtag + engagement ==========

CREATE TABLE IF NOT EXISTS "Artwork" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "seriesId" TEXT,
    "postType" TEXT NOT NULL DEFAULT 'work',
    "title" TEXT,
    "caption" TEXT,
    "imageUrl" TEXT NOT NULL,
    "medium" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "inPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Artwork_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Artwork_artistId_idx" ON "Artwork"("artistId");
CREATE INDEX IF NOT EXISTS "Artwork_seriesId_idx" ON "Artwork"("seriesId");
CREATE INDEX IF NOT EXISTS "Artwork_artistId_createdAt_idx" ON "Artwork"("artistId", "createdAt");
CREATE INDEX IF NOT EXISTS "Artwork_postType_idx" ON "Artwork"("postType");
CREATE INDEX IF NOT EXISTS "Artwork_createdAt_idx" ON "Artwork"("createdAt");

DO $$ BEGIN
  ALTER TABLE "Artwork"
    ADD CONSTRAINT "Artwork_artistId_fkey"
    FOREIGN KEY ("artistId") REFERENCES "ArtistProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Artwork"
    ADD CONSTRAINT "Artwork_seriesId_fkey"
    FOREIGN KEY ("seriesId") REFERENCES "ArtworkSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Hashtag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Hashtag_tag_key" ON "Hashtag"("tag");
CREATE INDEX IF NOT EXISTS "Hashtag_tag_idx" ON "Hashtag"("tag");

CREATE TABLE IF NOT EXISTS "ArtworkHashtag" (
    "artworkId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtworkHashtag_pkey" PRIMARY KEY ("artworkId", "hashtagId")
);
CREATE INDEX IF NOT EXISTS "ArtworkHashtag_hashtagId_idx" ON "ArtworkHashtag"("hashtagId");

DO $$ BEGIN
  ALTER TABLE "ArtworkHashtag"
    ADD CONSTRAINT "ArtworkHashtag_artworkId_fkey"
    FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ArtworkHashtag"
    ADD CONSTRAINT "ArtworkHashtag_hashtagId_fkey"
    FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ArtworkLike" (
    "artworkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtworkLike_pkey" PRIMARY KEY ("artworkId", "userId")
);
CREATE INDEX IF NOT EXISTS "ArtworkLike_userId_idx" ON "ArtworkLike"("userId");

DO $$ BEGIN
  ALTER TABLE "ArtworkLike"
    ADD CONSTRAINT "ArtworkLike_artworkId_fkey"
    FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ArtworkCollabInterest" (
    "artworkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtworkCollabInterest_pkey" PRIMARY KEY ("artworkId", "userId")
);
CREATE INDEX IF NOT EXISTS "ArtworkCollabInterest_userId_idx" ON "ArtworkCollabInterest"("userId");

DO $$ BEGIN
  ALTER TABLE "ArtworkCollabInterest"
    ADD CONSTRAINT "ArtworkCollabInterest_artworkId_fkey"
    FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "ArtworkComment" (
    "id" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArtworkComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ArtworkComment_artworkId_createdAt_idx" ON "ArtworkComment"("artworkId", "createdAt");
CREATE INDEX IF NOT EXISTS "ArtworkComment_userId_idx" ON "ArtworkComment"("userId");

DO $$ BEGIN
  ALTER TABLE "ArtworkComment"
    ADD CONSTRAINT "ArtworkComment_artworkId_fkey"
    FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== Gatherings ==========

CREATE TABLE IF NOT EXISTS "Gathering" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "location" TEXT,
    "note" TEXT,
    "happenedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Gathering_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Gathering_happenedAt_idx" ON "Gathering"("happenedAt");

CREATE TABLE IF NOT EXISTS "GatheringAttendee" (
    "id" TEXT NOT NULL,
    "gatheringId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GatheringAttendee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GatheringAttendee_gatheringId_artistId_key" ON "GatheringAttendee"("gatheringId", "artistId");
CREATE INDEX IF NOT EXISTS "GatheringAttendee_artistId_idx" ON "GatheringAttendee"("artistId");
CREATE INDEX IF NOT EXISTS "GatheringAttendee_gatheringId_idx" ON "GatheringAttendee"("gatheringId");

DO $$ BEGIN
  ALTER TABLE "GatheringAttendee"
    ADD CONSTRAINT "GatheringAttendee_gatheringId_fkey"
    FOREIGN KEY ("gatheringId") REFERENCES "Gathering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ========== Verify ==========
-- After running, this should return one row per table:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('MomentReaction','Space','Curator','Exhibition','ExhibitionArtist',
                     'Artwork','Hashtag','ArtworkHashtag','ArtworkLike',
                     'ArtworkCollabInterest','ArtworkComment','Gathering','GatheringAttendee')
ORDER BY table_name;
