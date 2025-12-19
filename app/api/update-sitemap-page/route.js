import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/db";

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
    const { html } = body;

    if (!html) {
      return NextResponse.json({ error: "HTML content missing" }, { status: 400 });
    }

    // 1️⃣ Get existing page by handle
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

    // 2️⃣ Update page HTML
    const updateRes = await fetch(
      `https://${shop}/admin/api/2025-01/pages/${page.id}.json`,
      {
        method: "PUT",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: {
            body_html: html,
          },
        }),
      }
    );

    const updated = await updateRes.json();

    if (!updateRes.ok) {
      return NextResponse.json({ error: updated }, { status: updateRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to update sitemap page" },
      { status: 500 }
    );
  }
}
