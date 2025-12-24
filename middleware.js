import { NextResponse } from "next/server";

function normalizeShop(shop) {
  if (!shop) return null;
  return shop.replace(/^https?:\/\//, "").split("/")[0].trim();
}

export function middleware(req) {
  const res = NextResponse.next();

  const url = req.nextUrl;
  const shop = normalizeShop(url.searchParams.get("shop"));

  // Allow Shopify Admin + the specific shop domain to frame the app
  const frameAncestors = shop
    ? `frame-ancestors https://admin.shopify.com https://${shop};`
    : `frame-ancestors https://admin.shopify.com https://*.myshopify.com;`;

  // Set CSP (only frame-ancestors)
  res.headers.set("Content-Security-Policy", frameAncestors);

  // Debug header (optional)
  res.headers.set("x-middleware-hit", "1");

  return res;
}

// ✅ FIXED config (no syntax error) + exclude /api, _next, static files
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
