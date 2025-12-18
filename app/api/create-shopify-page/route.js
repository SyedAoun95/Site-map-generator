import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    const shop = body.shop;
    const urls = Array.isArray(body.urls) ? body.urls : [];

    if (!shop || !urls.length) {
      return NextResponse.json({ error: "Shop or URLs missing" }, { status: 400 });
    }

    const accessToken = getAccessToken(shop);
    if (!accessToken) {
      return NextResponse.json({ error: "Access token not found" }, { status: 401 });
    }

    // Build HTML
    const htmlContent = `
      <div style="padding:16px;background:#f9fafb;border-radius:8px;font-family:system-ui,sans-serif;">
        <h2 style="font-size:18px;font-weight:600;margin-bottom:12px;">Sitemap URLs</h2>
        <ul style="list-style:disc;padding-left:20px;">
          ${urls.map(url => `<li style="margin-bottom:4px;"><a href="${url.loc}" style="color:#0052cc;text-decoration:none;">${url.loc}</a></li>`).join('')}
        </ul>
      </div>
    `;

    const res = await fetch(`https://${shop}/admin/api/2025-10/pages.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        page: {
          title: "Sitemap URLs",
          body_html: htmlContent,
          published: true,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.errors || "Failed to create page" }, { status: 500 });
    }

    return NextResponse.json({ success: true, page: data.page });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
