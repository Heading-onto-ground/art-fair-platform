const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const portfolioUrl = "/seed_portfolio.pdf";

  const artists = [
    { email: "artist_kr@demo.com", artistId: "KR-ART-001", name: "Min Kim", country: "한국", city: "Seoul", startedYear: 2018, genre: "Painting" },
    { email: "artist_jp@demo.com", artistId: "JP-ART-001", name: "Sora Tanaka", country: "일본", city: "Tokyo", startedYear: 2016, genre: "Installation" },
    { email: "artist_uk@demo.com", artistId: "UK-ART-001", name: "Emma Clark", country: "영국", city: "London", startedYear: 2014, genre: "Photography" },
    { email: "artist_us@demo.com", artistId: "US-ART-001", name: "Liam Carter", country: "미국", city: "New York", startedYear: 2019, genre: "Sculpture" },
    { email: "artist_fr@demo.com", artistId: "FR-ART-001", name: "Chloe Martin", country: "프랑스", city: "Paris", startedYear: 2017, genre: "Mixed Media" },
    { email: "artist_de@demo.com", artistId: "DE-ART-001", name: "Mila Schmidt", country: "독일", city: "Berlin", startedYear: 2015, genre: "Digital" },
    { email: "artist_it@demo.com", artistId: "IT-ART-001", name: "Luca Rossi", country: "이탈리아", city: "Milan", startedYear: 2013, genre: "Painting" },
    { email: "artist_es@demo.com", artistId: "ES-ART-001", name: "Sofia Garcia", country: "스페인", city: "Madrid", startedYear: 2020, genre: "Illustration" },
    { email: "artist_ca@demo.com", artistId: "CA-ART-001", name: "Noah Chen", country: "캐나다", city: "Toronto", startedYear: 2012, genre: "Sculpture" },
    { email: "artist_au@demo.com", artistId: "AU-ART-001", name: "Ruby Lee", country: "호주", city: "Sydney", startedYear: 2011, genre: "Photography" },
  ];

  const galleries = [
    { email: "gallery_dmx69@naver.com", galleryId: "KR-GAL-001", name: "Aurora Gallery", country: "한국", city: "Seoul", address: "Seoul, KR (MVP address)", foundedYear: 2010 },
    { email: "gallery_tokyo@art.jp", galleryId: "JP-GAL-001", name: "Blue Harbor Art Space", country: "일본", city: "Tokyo", address: "Tokyo, JP (MVP address)", foundedYear: 2012 },
    { email: "gallery_london@art.uk", galleryId: "UK-GAL-001", name: "North Bridge Gallery", country: "영국", city: "London", address: "London, UK (MVP address)", foundedYear: 2008 },
  ];

  for (const a of artists) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: {},
      create: {
        email: a.email,
        role: "artist",
        passwordHash: bcrypt.hashSync("artist123", 10),
      },
    });

    await prisma.artistProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        artistId: a.artistId,
        name: a.name,
        startedYear: a.startedYear,
        genre: a.genre,
        country: a.country,
        city: a.city,
        portfolioUrl,
        instagram: null,
      },
    });
  }

  for (const g of galleries) {
    const user = await prisma.user.upsert({
      where: { email: g.email },
      update: {},
      create: {
        email: g.email,
        role: "gallery",
        passwordHash: bcrypt.hashSync("gallery123", 10),
      },
    });

    await prisma.galleryProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        galleryId: g.galleryId,
        name: g.name,
        address: g.address,
        foundedYear: g.foundedYear,
        country: g.country,
        city: g.city,
        instagram: null,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
