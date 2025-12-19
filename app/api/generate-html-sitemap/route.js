import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/db";
import { buildSitemapHtml } from "@/lib/sitemapHtml";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Shop missing" }, { status: 400 });
    }

    const accessToken = getAccessToken(shop);
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { urls = [] } = body;

    if (!Array.isArray(urls) || !urls.length) {
      return NextResponse.json({ error: "No URLs provided" }, { status: 400 });
    }

    const groups = {
      products: [],
      collections: [],
      pages: [],
      blogs: [],
    };

    for (const url of urls) {
      if (url.includes("/products/")) groups.products.push(url);
      else if (url.includes("/collections/")) groups.collections.push(url);
      else if (url.includes("/blogs/")) groups.blogs.push(url);
      else groups.pages.push(url);
    }

    const html = buildSitemapHtml(groups);

    // 🔁 Update existing sitemap page
    const pageRes = await fetch(
      `https://${shop}/admin/api/2025-01/pages.json?handle=sitemap`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    const pageData = await pageRes.json();
    const page = pageData?.pages?.[0];

    if (!page) {
      return NextResponse.json({ error: "Sitemap page not found" }, { status: 404 });
    }

    const updateRes = await fetch(
      `https://${shop}/admin/api/2025-01/pages/${page.id}.json`,
      {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: { body_html: html },
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.text();
      return NextResponse.json({ error: err }, { status: 500 });
    }

    return NextResponse.json({ success: true, counts: {
      products: groups.products.length,
      collections: groups.collections.length,
      blogs: groups.blogs.length,
      pages: groups.pages.length,
    }});
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to generate sitemap" },
      { status: 500 }
    );
  }
}
