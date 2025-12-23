import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/db";
import { buildSitemapHtml } from "@/lib/sitemapHtml";

export const dynamic = "force-dynamic";

/* ----------------------------------------
   🔵 Shopify Data Fetch Helpers
---------------------------------------- */

async function fetchPages(shop, token) {
  const res = await fetch(
    `https://${shop}/admin/api/2025-01/pages.json?limit=250`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const data = await res.json();
  return (data.pages || []).map(p => ({
    title: p.title,
    url: `https://${shop}/pages/${p.handle}`,
  }));
}

async function fetchCollections(shop, token) {
  const res = await fetch(
    `https://${shop}/admin/api/2025-01/custom_collections.json?limit=250`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const data = await res.json();
  return (data.custom_collections || []).map(c => ({
    title: c.title,
    url: `https://${shop}/collections/${c.handle}`,
  }));
}

async function fetchProducts(shop, token) {
  const res = await fetch(
    `https://${shop}/admin/api/2025-01/products.json?limit=250`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const data = await res.json();
  return (data.products || []).map(p => ({
    title: p.title,
    url: `https://${shop}/products/${p.handle}`,
  }));
}

async function fetchBlogs(shop, token) {
  const res = await fetch(
    `https://${shop}/admin/api/2025-01/blogs.json`,
    { headers: { "X-Shopify-Access-Token": token } }
  );
  const data = await res.json();

  const blogs = [];

  for (const blog of data.blogs || []) {
    const aRes = await fetch(
      `https://${shop}/admin/api/2025-01/blogs/${blog.id}/articles.json`,
      { headers: { "X-Shopify-Access-Token": token } }
    );
    const aData = await aRes.json();

    (aData.articles || []).forEach(article => {
      blogs.push({
        title: article.title,
        url: `https://${shop}/blogs/${blog.handle}/${article.handle}`,
      });
    });
  }

  return blogs;
}

/* ----------------------------------------
   🔵 MAIN API HANDLER
---------------------------------------- */

export async function POST(request) {
  try {
    const body = await request.json();
    const sitemapResults = body?.sitemapResults;

    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Shop missing" }, { status: 400 });
    }

    const accessToken = getAccessToken(shop);
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ----------------------------------------
       🔵 STEP 3 — Fetch Titles
    ---------------------------------------- */

    const pages = await fetchPages(shop, accessToken);
    const collections = await fetchCollections(shop, accessToken);
    const products = await fetchProducts(shop, accessToken);
    const blogs = await fetchBlogs(shop, accessToken);

    /* ----------------------------------------
       🔵 STEP 4 — Build HTML Sitemap
    ---------------------------------------- */

    const html = buildSitemapHtml({
      pages,
      collections,
      products,
      blogs,
    });

    /* ----------------------------------------
       🔵 STEP 5 — Create Shopify Page
    ---------------------------------------- */

    const pagePayload = {
      page: {
        title: "HTML Sitemap",
        handle: "sitemap",
        body_html: html,
        published: true,
      },
    };

    const response = await fetch(
      `https://${shop}/admin/api/2025-01/pages.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pagePayload),
      }
    );

    const data = await response.json();

    /* ----------------------------------------
       🟡 Page Already Exists
    ---------------------------------------- */
    if (response.status === 422 && data?.errors?.handle) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        pageUrl: `https://${shop}/pages/sitemap`,
      });
    }

    /* ----------------------------------------
       🔴 Real Error
    ---------------------------------------- */
    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to create sitemap page" },
        { status: response.status }
      );
    }

    /* ----------------------------------------
       ✅ Success
    ---------------------------------------- */

    return NextResponse.json({
      success: true,
      pageUrl: `https://${shop}/pages/${data.page.handle}`,
    });

  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
