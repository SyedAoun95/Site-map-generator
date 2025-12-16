import { NextResponse } from "next/server";
import { parseStringPromise } from "xml2js";

export async function POST(req) {
  try {
    const body = await req.json();
    const sitemapUrls = Array.isArray(body?.sitemapUrls) ? body.sitemapUrls : [];
    const maxTotal = Number(body?.maxTotal ?? 500);
    const maxChildSitemaps = Number(body?.maxChildSitemaps ?? 10);

    if (!sitemapUrls.length) {
      return NextResponse.json({ urls: [], total: 0 });
    }

    const out = [];
    const seen = new Set();

    async function fetchXml(url) {
      const res = await fetch(url, {
        headers: { "User-Agent": "Sitemap-Explorer/1.0" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
      return res.text();
    }

    function addUrl(loc, meta = {}) {
      if (!loc) return;
      const key = String(loc).trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ loc: key, ...meta });
    }

    async function parseSitemap(url, depth = 0) {
      if (out.length >= maxTotal) return;

      const xml = await fetchXml(url);
      const json = await parseStringPromise(xml, { explicitArray: true, trim: true });

      // urlset => real URLs
      if (json?.urlset?.url) {
        for (const u of json.urlset.url) {
          if (out.length >= maxTotal) break;
          addUrl(u?.loc?.[0], {
            lastmod: u?.lastmod?.[0] || null,
            changefreq: u?.changefreq?.[0] || null,
            sourceSitemap: url,
          });
        }
        return;
      }

      // sitemapindex => child sitemap files
      if (json?.sitemapindex?.sitemap && depth < 1) {
        const children = json.sitemapindex.sitemap
          .map((s) => s?.loc?.[0])
          .filter(Boolean)
          .slice(0, maxChildSitemaps);

        for (const child of children) {
          if (out.length >= maxTotal) break;
          await parseSitemap(child, depth + 1);
        }
        return;
      }
    }

    for (const sUrl of sitemapUrls) {
      if (out.length >= maxTotal) break;
      await parseSitemap(sUrl, 0);
    }

    return NextResponse.json({ urls: out, total: out.length, limited: out.length >= maxTotal });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to parse sitemap urls" },
      { status: 500 }
    );
  }
}