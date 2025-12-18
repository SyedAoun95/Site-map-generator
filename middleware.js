import { NextResponse } from "next/server";

function normalizeShop(shop) {
  if (!shop) return null;
  return shop.replace(/^https?:\/\//, "").split("/")[0].trim();
}

export function middleware(req) {
  const res = NextResponse.next();

  const url = req.nextUrl;
  const shop = normalizeShop(url.searchParams.get("shop"));

  const frameAncestors = shop
    ? `frame-ancestors https://admin.shopify.com https://${shop};`
    : `frame-ancestors https://admin.shopify.com https://*.myshopify.com;`;

  res.headers.set("x-middleware-hit","1");
  res.headers.set("Content-Security-Policy", frameAncestors);

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
