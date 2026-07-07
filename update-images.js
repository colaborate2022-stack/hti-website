// Updates the cover_image column for each blog post in Supabase, matching by slug.
// Run with: node update-images.js

const SUPABASE_URL = "https://ytthcgdsbfagvwcopoaj.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0dGhjZ2RzYmZhZ3Z3Y29wb2FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMjk5MTMsImV4cCI6MjA5ODkwNTkxM30.JIDahcRTu3VbFpZ55Ti5hHg_JrHobk0zh8PSaj9lWLc";

const CDN = "https://cdn.prod.website-files.com/637627a62b1c3e0d3b7b3432/";

const updates = [
  { slug: "hospitality-is-about-how-guests-feel", cover_image: CDN + "6a3d16f434a1e63bbe0e9d46_Blog-28.avif" },
  { slug: "customer-service-heart-hospitality", cover_image: CDN + "6a1148a89c01125a75bc0916_Blog%2026%20-%20Thumbnail.avif" },
  { slug: "myths-hospitality-careers-truth", cover_image: CDN + "6a22968826bfac379a960bd7_Blog-27.avif" },
  { slug: "skills-aspiring-hospitality-professionals", cover_image: CDN + "6a0576a94de86899cb64554d_Blog-25%20Thumbnail.avif" },
  { slug: "suggestive-vs-upselling-vs-cross-selling", cover_image: CDN + "699ecc24fab90d4bd53130a3_2602%20HTI%20Blogs%2022%20for%20Open%20Graph%20Image.png" },
  { slug: "if-hospitality-was-easy-everyone-would-do-it", cover_image: CDN + "69c0ed81e14b7c4438ac0610_Blog-23.avif" },
  { slug: "crisis-management-training-in-hospitality", cover_image: CDN + "69e327602a0ecb34dae0c650_Thumbnail%20Blog-24.avif" },
  { slug: "guesthouse-staff-training", cover_image: CDN + "68ed148ddbaad3d746b0be2e_Blog%2019%20thumbnail.svg" },
  { slug: "the-boom-of-caretaker-training", cover_image: CDN + "694fa91470cc03440cfb0be3_Blog%2020%20thumbnail.svg" },
  { slug: "restaurant-feedback-dining-experience", cover_image: CDN + "69999854614c49359055dc5d_Blog%2021%20thumbnail.svg" },
  { slug: "best-practices-customer-service-hospitality", cover_image: CDN + "666d4336383f46e4eb6d7ce8_Blog%2016%20thumbnail.svg" },
  { slug: "top-skills-front-end-hospitality-professionals", cover_image: CDN + "667122bafa0dba75a0ae1a93_Blog%2017%20thumbnail.svg" },
  { slug: "customer-service-boundaries", cover_image: CDN + "689dbe3ae437b74e9c3756f8_Blog%2018%20thumbnail%20(1).avif" },
  { slug: "from-server-to-gm", cover_image: CDN + "655daacb49fe9628bcf917c6_Vishal%20Gupta%20Blog%20thumbnail.png" },
  { slug: "effective-housekeeping-training", cover_image: CDN + "6572dd51fca110920938d99e_HTI%20Blog%20thumbnail.webp" },
  { slug: "chef-abhijeet-success-story", cover_image: CDN + "65950c23f58cc2c04af87191_Abhijeet%20Bagwe%20Blog%20thumbnail.svg" },
  { slug: "pankaj-gupta-bootstrapping-restaurant-success", cover_image: CDN + "64fed3ff85304ca4803ecf1d_Pankaj%20Gupta-HS.png" },
  { slug: "yazu-fine-dining-entrepreneur-restaurateur", cover_image: CDN + "64bf69e78945f4821215c71e_Ranvir%20Nagpal_Blog%20Thumbnail.svg" },
  { slug: "food-production-jargon", cover_image: CDN + "64b118e7d0fa2f704fbe37b1_4.%20Food%20Production%20Department.svg" },
  { slug: "housekeeping-jargon", cover_image: CDN + "64afc1e14ed91034cb42b08d_1.%20Housekeeping%20Department.svg" },
  { slug: "food-and-beverage-jargon", cover_image: CDN + "64b118e743a97b63d4cb409b_2.%20F%26B%20Department.svg" },
  { slug: "front-office-jargon-terms", cover_image: CDN + "64affc9ae1662951f25ca73a_3.%20Front%20Office%20Department.svg" },
  { slug: "fostac-blog", cover_image: CDN + "64253269432e053f43ac84e6_Blog%204.svg" },
  { slug: "what-is-kpis", cover_image: CDN + "6475904597aebdbe6d61ee53_Blog%205_%20What%20is%20KPIs.svg" },
  { slug: "agnibh-mudi", cover_image: CDN + "64b695bef4775a8c6a72c239_Corporate%20Chef%20Agnibh%20Mudi.svg" },
  { slug: "sanjay-vazirani", cover_image: CDN + "63ca940744dbbffe5ef5c015_1.png" },
  { slug: "what-is-hospitality", cover_image: CDN + "63d75abf1938080ee1283d28_Blogs%202%20for%20Thumbnails.png" },
  { slug: "hospitality-definition-and-meaning-hindi-blog", cover_image: CDN + "63d75abf1938080ee1283d28_Blogs%202%20for%20Thumbnails.png" }
];

async function run() {
  let ok = 0, skipped = 0, failed = 0;

  for (const u of updates) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/blogs?slug=eq.${encodeURIComponent(u.slug)}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation"
          },
          body: JSON.stringify({ cover_image: u.cover_image })
        }
      );

      const text = await res.text();
      if (!res.ok) {
        failed++;
        console.log(`✗ ${u.slug} — HTTP ${res.status}: ${text}`);
        continue;
      }

      let rows = [];
      try { rows = JSON.parse(text); } catch (_) {}
      if (Array.isArray(rows) && rows.length > 0) {
        ok++;
        console.log(`✓ ${u.slug} — updated (${rows.length} row${rows.length > 1 ? "s" : ""})`);
      } else {
        skipped++;
        console.log(`• ${u.slug} — no matching row (0 updated)`);
      }
    } catch (err) {
      failed++;
      console.log(`✗ ${u.slug} — error: ${err.message}`);
    }
  }

  console.log(`\nDone. Updated: ${ok}, no-match: ${skipped}, failed: ${failed}, total: ${updates.length}`);
}

run();
