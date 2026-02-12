/**
 * Run: npx tsx scripts/seed-galleries.ts
 * Seeds real gallery data directly via pg Pool.
 */
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Use DATABASE_URL, stripping any trailing \n from .env.local
const dbUrl = (process.env.DATABASE_URL || "").replace(/\\n$/, "").trim();
const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const GALLERIES = [
  { name: "PKM Gallery", city: "Seoul", country: "한국", website: "https://www.pkmgallery.com", founded: 2001, bio: "Contemporary art gallery in Samcheong-dong, Seoul, representing leading Korean and international artists.", address: "PKM Gallery, Samcheong-ro, Jongno-gu, Seoul" },
  { name: "Kukje Gallery", city: "Seoul", country: "한국", website: "https://www.kukjegallery.com", founded: 1982, bio: "One of Korea's most prominent galleries, showcasing major contemporary artists from Korea and abroad since 1982.", address: "54 Samcheong-ro, Jongno-gu, Seoul" },
  { name: "Gallery Hyundai", city: "Seoul", country: "한국", website: "https://www.galleryhyundai.com", founded: 1970, bio: "Korea's first commercial gallery, established in 1970. A cornerstone of the Korean art market.", address: "14 Samcheong-ro, Jongno-gu, Seoul" },
  { name: "Arario Gallery", city: "Seoul", country: "한국", website: "https://www.arariogallery.com", founded: 2002, bio: "International contemporary art gallery with spaces in Seoul, Cheonan, and Shanghai.", address: "83 Yulgok-ro, Jongno-gu, Seoul" },
  { name: "Pace Gallery Seoul", city: "Seoul", country: "한국", website: "https://www.pacegallery.com", founded: 2017, bio: "Seoul outpost of the renowned international gallery Pace, located in Hannam-dong.", address: "267 Itaewon-ro, Yongsan-gu, Seoul" },
  { name: "Leeahn Gallery", city: "Seoul", country: "한국", website: "https://www.leeahngallery.com", founded: 2007, bio: "Contemporary art gallery in Dosan Park area, focusing on emerging and mid-career artists.", address: "Dosan-daero, Gangnam-gu, Seoul" },
  { name: "Johyun Gallery", city: "Busan", country: "한국", website: "https://www.johyungallery.com", founded: 2001, bio: "Leading gallery in Busan, presenting contemporary Korean and international art.", address: "Haeundae-gu, Busan" },
  { name: "SCAI The Bathhouse", city: "Tokyo", country: "일본", website: "https://www.scaithebathhouse.com", founded: 1993, bio: "Located in a 200-year-old bathhouse in Yanaka, one of Tokyo's most distinctive contemporary art spaces.", address: "Kashiwaya-cho, Yanaka, Taito-ku, Tokyo" },
  { name: "Tomio Koyama Gallery", city: "Tokyo", country: "일본", website: "https://www.tomiokoyamagallery.com", founded: 1996, bio: "Represents major Japanese contemporary artists including Yoshitomo Nara.", address: "Tennozu, Shinagawa-ku, Tokyo" },
  { name: "Taka Ishii Gallery", city: "Tokyo", country: "일본", website: "https://www.takaishiigallery.com", founded: 1994, bio: "One of Japan's leading contemporary art galleries, specializing in photography and contemporary art.", address: "complex665, Roppongi, Minato-ku, Tokyo" },
  { name: "Ota Fine Arts", city: "Tokyo", country: "일본", website: "https://www.otafinearts.com", founded: 1994, bio: "Represents Yayoi Kusama and other significant Japanese and Asian contemporary artists.", address: "Tennozu, Shinagawa-ku, Tokyo" },
  { name: "Mizuma Art Gallery", city: "Tokyo", country: "일본", website: "https://mizuma-art.co.jp", founded: 1994, bio: "Promotes Asian contemporary art globally with a strong focus on Japanese artists.", address: "Ichigaya-tamachi, Shinjuku-ku, Tokyo" },
  { name: "White Cube", city: "London", country: "영국", website: "https://www.whitecube.com", founded: 1993, bio: "Founded by Jay Jopling, White Cube is one of the world's most influential contemporary art galleries.", address: "144-152 Bermondsey Street, London SE1" },
  { name: "Lisson Gallery", city: "London", country: "영국", website: "https://www.lissongallery.com", founded: 1967, bio: "One of the longest-running international contemporary art galleries, founded by Nicholas Logsdail.", address: "27 Bell Street, London NW1" },
  { name: "Sadie Coles HQ", city: "London", country: "영국", website: "https://www.sadiecoles.com", founded: 1997, bio: "One of London's leading contemporary art galleries representing an international roster of artists.", address: "1 Davies Street, London W1" },
  { name: "Victoria Miro", city: "London", country: "영국", website: "https://www.victoria-miro.com", founded: 1985, bio: "Represents internationally renowned artists including Yayoi Kusama, Grayson Perry, and Chris Ofili.", address: "16 Wharf Road, London N1" },
  { name: "Galerie Perrotin", city: "Paris", country: "프랑스", website: "https://www.perrotin.com", founded: 1990, bio: "Major international gallery founded by Emmanuel Perrotin with spaces worldwide.", address: "76 Rue de Turenne, 75003 Paris" },
  { name: "Galerie Thaddaeus Ropac", city: "Paris", country: "프랑스", website: "https://www.ropac.net", founded: 1983, bio: "Leading European gallery with spaces in Paris, Salzburg, and London.", address: "7 Rue Debelleyme, 75003 Paris" },
  { name: "Kamel Mennour", city: "Paris", country: "프랑스", website: "https://www.kamelmennour.com", founded: 1999, bio: "One of the most prominent galleries in Paris, representing a diverse international program.", address: "47 Rue Saint-André des Arts, 75006 Paris" },
  { name: "Gagosian", city: "New York", country: "미국", website: "https://gagosian.com", founded: 1980, bio: "The world's largest gallery network with 21 locations globally, founded by Larry Gagosian.", address: "555 West 24th Street, New York, NY 10011" },
  { name: "David Zwirner", city: "New York", country: "미국", website: "https://www.davidzwirner.com", founded: 1993, bio: "One of the most influential contemporary art galleries in the world.", address: "537 West 20th Street, New York, NY 10011" },
  { name: "Hauser & Wirth", city: "New York", country: "미국", website: "https://www.hauserwirth.com", founded: 1992, bio: "Major international gallery with spaces in Zurich, London, New York, Los Angeles, and Somerset.", address: "32 East 69th Street, New York, NY 10021" },
  { name: "Marian Goodman Gallery", city: "New York", country: "미국", website: "https://www.mariangoodman.com", founded: 1977, bio: "Pioneering gallery representing major international contemporary artists.", address: "24 West 57th Street, New York, NY 10019" },
  { name: "Blum & Poe", city: "Los Angeles", country: "미국", website: "https://www.blumandpoe.com", founded: 1994, bio: "Leading Los Angeles gallery focused on post-war and contemporary art.", address: "2727 S La Cienega Blvd, Los Angeles, CA 90034" },
  { name: "Sprüth Magers", city: "Berlin", country: "독일", website: "https://www.spruethmagers.com", founded: 1983, bio: "Major international gallery with spaces in Berlin, London, and Los Angeles.", address: "Oranienburger Str. 18, 10178 Berlin" },
  { name: "König Galerie", city: "Berlin", country: "독일", website: "https://www.koeniggalerie.com", founded: 2002, bio: "Located in a brutalist church in Kreuzberg, one of Berlin's most iconic art spaces.", address: "Alexandrinenstraße 118-121, 10969 Berlin" },
  { name: "Esther Schipper", city: "Berlin", country: "독일", website: "https://www.estherschipper.com", founded: 1989, bio: "Renowned Berlin gallery representing conceptual and post-conceptual artists.", address: "Potsdamer Str. 81E, 10785 Berlin" },
  { name: "Galleria Continua", city: "San Gimignano", country: "이탈리아", website: "https://www.galleriacontinua.com", founded: 1990, bio: "Unique gallery in a medieval Tuscan town, with additional spaces in Beijing, Havana, Rome, São Paulo, Paris, and Dubai.", address: "Via del Castello 11, 53037 San Gimignano" },
  { name: "Massimo De Carlo", city: "Milan", country: "이탈리아", website: "https://www.massimodecarlo.com", founded: 1987, bio: "One of Italy's most important contemporary art galleries with spaces in Milan, London, Hong Kong, and Paris.", address: "Via Ventura 5, 20134 Milan" },
  { name: "Long March Space", city: "Beijing", country: "중국", website: "https://www.longmarchspace.com", founded: 2002, bio: "One of the most important contemporary art galleries in China.", address: "4 Jiuxianqiao Road, Chaoyang District, Beijing" },
  { name: "ShanghART Gallery", city: "Shanghai", country: "중국", website: "https://www.shanghartgallery.com", founded: 1996, bio: "One of China's first contemporary art galleries, representing leading Chinese artists.", address: "Building 16, 2555 Longteng Avenue, Xuhui District, Shanghai" },
  { name: "Galerie Eva Presenhuber", city: "Zurich", country: "스위스", website: "https://www.presenhuber.com", founded: 1997, bio: "One of Switzerland's leading contemporary art galleries.", address: "Maag Areal, Zahnradstrasse 21, 8005 Zurich" },
  { name: "Roslyn Oxley9 Gallery", city: "Sydney", country: "호주", website: "https://www.roslynoxley9.com.au", founded: 1982, bio: "One of Australia's most significant contemporary art galleries.", address: "8 Soudan Lane, Paddington NSW 2021" },
  { name: "Anna Schwartz Gallery", city: "Melbourne", country: "호주", website: "https://www.annaschwartzgallery.com", founded: 1986, bio: "Leading Melbourne gallery representing significant Australian and international contemporary artists.", address: "185 Flinders Lane, Melbourne VIC 3000" },
];

function cuid() {
  return "c" + crypto.randomBytes(12).toString("hex");
}

async function main() {
  const client = await pool.connect();
  const dummyHash = bcrypt.hashSync("gallery-directory-2026", 10);
  let created = 0, updated = 0, errors = 0;

  try {
    for (const g of GALLERIES) {
      const email = `directory_${g.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}@rob.art`;
      const galleryId = `DIR-${g.name.replace(/\s+/g, "-").toUpperCase().slice(0, 20)}`;

      try {
        // Check if user exists
        const userRes = await client.query(
          `SELECT id FROM "User" WHERE email = $1 AND role = 'gallery'`,
          [email]
        );

        let userId: string;

        if (userRes.rows.length > 0) {
          userId = userRes.rows[0].id;
          // Update existing profile
          await client.query(
            `UPDATE "GalleryProfile" SET name=$1, address=$2, "foundedYear"=$3, country=$4, city=$5, website=$6, bio=$7, "updatedAt"=NOW() WHERE "userId"=$8`,
            [g.name, g.address, g.founded, g.country, g.city, g.website, g.bio, userId]
          );
          updated++;
          console.log(`✓ Updated: ${g.name}`);
        } else {
          // Create user
          userId = cuid();
          await client.query(
            `INSERT INTO "User" (id, email, role, "passwordHash") VALUES ($1, $2, 'gallery', $3)`,
            [userId, email, dummyHash]
          );
          // Create profile
          const profileId = cuid();
          await client.query(
            `INSERT INTO "GalleryProfile" (id, "userId", "galleryId", name, address, "foundedYear", country, city, website, bio, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [profileId, userId, galleryId, g.name, g.address, g.founded, g.country, g.city, g.website, g.bio]
          );
          created++;
          console.log(`✅ Created: ${g.name}`);
        }
      } catch (e: any) {
        errors++;
        console.error(`❌ Error (${g.name}): ${e?.message?.slice(0, 120)}`);
      }
    }
  } finally {
    client.release();
  }

  console.log(`\n🎯 Done! Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
