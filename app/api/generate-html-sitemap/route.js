import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/db";
import { buildSitemapHtml } from "@/lib/sitemapHtml";

// 🔹 TEMP sitemap page handle (testing phase)
const SITEMAP_PAGE_HANDLE = "sitemap-explorer-preview";
// 🔹 LIVE ke liye sirf yahan change karna hoga:
// const SITEMAP_PAGE_HANDLE = "sitemap";

export const dynamic = "force-dynamic";

// 🔹 helper: URL → readable title
const makeTitleFromUrl = (url) => {
  try {
    const u = new URL(url);
    const slug = u.pathname.split("/").filter(Boolean).pop();
    if (!slug) return "Untitled";

    return slug
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "Untitled";
  }
};

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    // 1️⃣ Validate shop
    if (!shop) {
      return NextResponse.json({ error: "Shop missing" }, { status: 400 });
    }

    // 2️⃣ Get access token
    const accessToken = getAccessToken(shop);
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 3️⃣ Read stored sitemap URLs
    const body = await request.json();
    const { urls } = body || {};

    // 🔹 URLs validation
    if (!urls || typeof urls !== "object") {
      return NextResponse.json(
        { error: "No stored sitemap URLs provided" },
        { status: 400 }
      );
    }

    // 4️⃣ Build FINAL DATA (source of truth = sitemap URLs)
    const finalData = {
      products: [],
      collections: [],
      pages: [],
      blogs: [],
    };

    for (const type of Object.keys(finalData)) {
  finalData[type] = (urls[type] || []).map((u) => {
    const loc = u.loc || u;
    const pathname = new URL(loc).pathname;

    return {
      title: makeTitleFromUrl(loc),
      url: `https://${shop}${pathname}`, // ✅ ABSOLUTE URL
    };
  });
}


    // 5️⃣ Build HTML sitemap
    const html = buildSitemapHtml(finalData);

    // 6️⃣ Check existing sitemap page
    const pageRes = await fetch(
      `https://${shop}/admin/api/2025-01/pages.json?handle=${SITEMAP_PAGE_HANDLE}`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    const pageData = await pageRes.json();
    let page = pageData?.pages?.[0];

    const pageUrl = `https://${shop}/pages/${SITEMAP_PAGE_HANDLE}`;

    // 7️⃣ Create page if not exists
    if (!page) {
      const createRes = await fetch(
        `https://${shop}/admin/api/2025-01/pages.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page: {
              title: "HTML Sitemap (Preview)",
              handle: SITEMAP_PAGE_HANDLE,
              body_html: html,
              published: true,
            },
          }),
        }
      );

      if (!createRes.ok) {
        const err = await createRes.text();
        return NextResponse.json({ error: err }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        created: true,
        pageUrl,
        counts: {
          products: finalData.products.length,
          collections: finalData.collections.length,
          pages: finalData.pages.length,
          blogs: finalData.blogs.length,
        },
      });
    }

    // 8️⃣ Update existing page
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

    // 9️⃣ Done ✅
    return NextResponse.json({
      success: true,
      updated: true,
      pageUrl,
      counts: {
        products: finalData.products.length,
        collections: finalData.collections.length,
        pages: finalData.pages.length,
        blogs: finalData.blogs.length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to generate sitemap" },
      { status: 500 }
    );
  }
}
