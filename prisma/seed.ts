import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

// .env.local 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config(); // .env fallback

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // 테스트 비밀번호 (모든 계정 동일)
  const testPassword = "test1234";
  const passwordHash = await bcrypt.hash(testPassword, 10);

  // ========== 갤러리 계정 생성 ==========
  const galleries = [
    {
      email: "gallery_seoul@test.com",
      profile: {
        galleryId: "GAL-001",
        name: "Aurora Gallery",
        address: "서울시 강남구 청담동 123-45",
        foundedYear: 2015,
        instagram: "https://instagram.com/aurora_gallery",
        country: "한국",
        city: "Seoul",
        website: "https://aurora-gallery.com",
        bio: "현대미술과 신진작가를 발굴하는 갤러리입니다. 매년 다양한 국제 아트페어에 참가합니다.",
      },
    },
    {
      email: "gallery_tokyo@test.com",
      profile: {
        galleryId: "GAL-002",
        name: "Blue Harbor Art Space",
        address: "東京都港区六本木7-22-2",
        foundedYear: 2010,
        instagram: "https://instagram.com/blueharbor_art",
        country: "일본",
        city: "Tokyo",
        website: "https://blueharbor.jp",
        bio: "日本とアジアの現代美術を世界に発信するギャラリーです。",
      },
    },
    {
      email: "gallery_london@test.com",
      profile: {
        galleryId: "GAL-003",
        name: "North Bridge Gallery",
        address: "15 Cork Street, Mayfair, London W1S 3LN",
        foundedYear: 2008,
        instagram: "https://instagram.com/northbridge_gallery",
        country: "영국",
        city: "London",
        website: "https://northbridgegallery.co.uk",
        bio: "Showcasing emerging and established contemporary artists from around the world.",
      },
    },
    {
      email: "gallery_paris@test.com",
      profile: {
        galleryId: "GAL-004",
        name: "Galerie Lumière",
        address: "12 Rue de Seine, 75006 Paris",
        foundedYear: 2012,
        instagram: "https://instagram.com/galerie_lumiere",
        country: "프랑스",
        city: "Paris",
        website: "https://galerie-lumiere.fr",
        bio: "Une galerie dédiée à l'art contemporain et aux nouvelles expressions artistiques.",
      },
    },
    {
      email: "gallery_newyork@test.com",
      profile: {
        galleryId: "GAL-005",
        name: "Chelsea Art House",
        address: "555 West 25th Street, New York, NY 10001",
        foundedYear: 2005,
        instagram: "https://instagram.com/chelseaarthouse",
        country: "미국",
        city: "New York",
        website: "https://chelseaarthouse.com",
        bio: "A leading contemporary art gallery in the heart of Chelsea, representing international artists.",
      },
    },
  ];

  console.log("📍 Creating gallery accounts...");
  
  for (const g of galleries) {
    const existing = await prisma.user.findUnique({ where: { email: g.email } });
    if (existing) {
      console.log(`  ⏭️  Gallery ${g.email} already exists`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: g.email,
        role: "gallery",
        passwordHash,
        galleryProfile: {
          create: g.profile,
        },
      },
    });
    console.log(`  ✅ Created: ${g.profile.name} (${g.email})`);
  }

  // ========== 아티스트 계정 생성 ==========
  const artists = [
    {
      email: "artist_kim@test.com",
      profile: {
        artistId: "ART-001",
        name: "김서연",
        startedYear: 2018,
        genre: "Painting",
        instagram: "https://instagram.com/seoyeon_art",
        country: "한국",
        city: "Seoul",
        website: "https://seoyeon-kim.art",
        bio: "서울을 기반으로 활동하는 현대미술 작가입니다. 도시의 일상과 감정을 추상적으로 표현합니다.",
      },
    },
    {
      email: "artist_tanaka@test.com",
      profile: {
        artistId: "ART-002",
        name: "田中美咲",
        startedYear: 2015,
        genre: "Installation",
        instagram: "https://instagram.com/misaki_tanaka",
        country: "일본",
        city: "Tokyo",
        website: "https://misaki-tanaka.com",
        bio: "空間とオブジェクトの関係性を探求するインスタレーション・アーティストです。",
      },
    },
    {
      email: "artist_smith@test.com",
      profile: {
        artistId: "ART-003",
        name: "Emma Smith",
        startedYear: 2012,
        genre: "Photography",
        instagram: "https://instagram.com/emmasmith_photo",
        country: "영국",
        city: "London",
        website: "https://emmasmith.photo",
        bio: "Documentary photographer focusing on urban landscapes and human stories.",
      },
    },
  ];

  console.log("\n🎨 Creating artist accounts...");

  for (const a of artists) {
    const existing = await prisma.user.findUnique({ where: { email: a.email } });
    if (existing) {
      console.log(`  ⏭️  Artist ${a.email} already exists`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        email: a.email,
        role: "artist",
        passwordHash,
        artistProfile: {
          create: a.profile,
        },
      },
    });
    console.log(`  ✅ Created: ${a.profile.name} (${a.email})`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Seeding completed!\n");
  console.log("📋 Test Accounts (password: test1234)");
  console.log("=".repeat(50));
  console.log("\n🏛️  Gallery Accounts:");
  galleries.forEach((g) => {
    console.log(`   • ${g.email} — ${g.profile.name} (${g.profile.city})`);
  });
  console.log("\n🎨 Artist Accounts:");
  artists.forEach((a) => {
    console.log(`   • ${a.email} — ${a.profile.name} (${a.profile.city})`);
  });
  console.log("\n" + "=".repeat(50));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
