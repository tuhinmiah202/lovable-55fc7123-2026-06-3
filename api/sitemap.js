export default async function handler(req, res) {
  const SUPABASE_URL = "https://ypskvfbyauvwjiipotqt.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlwc2t2ZmJ5YXV2d2ppaXBvdHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTI2MjAsImV4cCI6MjA4Nzc2ODYyMH0.F_v998jGVda-n0HtLDR4XKWxQ3KhAv3yE1gYNqoe3C0";
  const BASE_URL = "https://nexboi.online";

  // Static routes
  const routes = [
    "",
    "/books",
    "/categories",
    "/authors",
    "/help"
  ];

  let dynamicRoutes = [];
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/books?select=id,updated_at&blocked=eq.false`, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok) {
      const books = await response.json();
      dynamicRoutes = books.map(book => ({
        url: `/book/${book.id}`,
        lastmod: book.updated_at ? new Date(book.updated_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));
    }
  } catch (error) {
    console.error("Sitemap fetch error:", error);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${routes.map(route => `
  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>daily</changefreq>
    <priority>${route === "" ? "1.0" : "0.8"}</priority>
  </url>`).join('').trim()}
  ${dynamicRoutes.map(route => `
  <url>
    <loc>${BASE_URL}${route.url}</loc>
    <lastmod>${route.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`).join('').trim()}
</urlset>`.trim();

  res.setHeader('Content-Type', 'text/xml');
  // Cache for 1 hour on Vercel edge
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(sitemap);
}
