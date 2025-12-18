import crypto from "crypto";

export const dynamic = "force-dynamic"; // Prevent Next.js caching

// ---------------------- HMAC verification ----------------------
function verifyWebhookHmac(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  const hashBuffer = Buffer.from(hash, "utf8");
  const hmacBuffer = Buffer.from(hmacHeader, "utf8");

  if (hashBuffer.length !== hmacBuffer.length) return false;

  return crypto.timingSafeEqual(hashBuffer, hmacBuffer);
}

// ---------------------- Webhook handler ----------------------
export async function POST(req) {
  const rawBody = await req.text();

  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const shopDomain = req.headers.get("x-shopify-shop-domain");

  // ----------------- Step 1: Verify authenticity -----------------
  if (!verifyWebhookHmac(rawBody, hmac, process.env.SHOPIFY_API_SECRET)) {
    console.error("Invalid HMAC for customers/redact webhook from shop:", shopDomain);
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // ----------------- Step 2: Parse safely -----------------
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("Failed to parse customers/redact payload from shop:", shopDomain, err);
    return new Response(JSON.stringify({ error: "Bad Request" }), { status: 400 });
  }

  // ----------------- Step 3: Handle the request -----------------
  // Free app: no customer data stored, so this is intentionally a no-op
  // Shopify expects 200 OK to acknowledge the webhook
  console.log(`Received customers/redact webhook from shop: ${shopDomain}`);
  console.log("Request ID:", payload.id || "N/A");

  return new Response(JSON.stringify({ status: "received" }), { status: 200 });
}