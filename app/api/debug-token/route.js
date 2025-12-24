import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/db";
import db from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shop = searchParams.get("shop");

    if (!shop) {
      return NextResponse.json({ error: "Shop parameter required" }, { status: 400 });
    }

    // Check if shop exists in database
    const shopData = db.prepare(`SELECT shop, scopes, created_at, updated_at FROM shops WHERE shop = ?`).get(shop);
    
    // Get token using your function
    const token = getAccessToken(shop);

    return NextResponse.json({
      shop,
      shopExists: !!shopData,
      shopData: shopData || null,
      tokenExists: !!token,
      tokenLength: token?.length || 0,
      tokenPrefix: token?.substring(0, 15) || null,
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
