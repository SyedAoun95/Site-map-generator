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
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const pagePayload = {
      page: {
        title: "HTML Sitemap",
        handle: "sitemap",
        body_html: `
          <h1>HTML Sitemap</h1>
          <p>This page is generated automatically by Sitemap Explorer.</p>
        `,
        published: true
      }
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

    if (!response.ok) {
      return NextResponse.json(
        { error: data },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      page: data.page,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
