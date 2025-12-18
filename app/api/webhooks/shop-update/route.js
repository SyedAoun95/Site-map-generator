import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { updateShop } from '@/lib/db';

export const dynamic = 'force-dynamic';

function verifyWebhookHmac(rawBody, hmacHeader, secret) {
  if (!hmacHeader || !secret) return false;

  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  const hashBuffer = Buffer.from(hash, 'utf8');
  const hmacBuffer = Buffer.from(hmacHeader, 'utf8');

  if (hashBuffer.length !== hmacBuffer.length) return false;

  return crypto.timingSafeEqual(hashBuffer, hmacBuffer);
}

export async function POST(request) {
  const rawBody = await request.text();

  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const topic = request.headers.get('x-shopify-topic');
  const shopDomain = request.headers.get('x-shopify-shop-domain');

  if (topic !== 'shop/update') {
    return new NextResponse(null, { status: 200 });
  }

  if (!hmac || !shopDomain) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }

  const secret = process.env.SHOPIFY_API_SECRET;

  if (!verifyWebhookHmac(rawBody, hmac, secret)) {
    console.error('❌ Invalid shop/update HMAC');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  //  ONLY store what you actually need
  const updates = {
    name: payload.name,
    email: payload.email,
    currency: payload.currency,
    timezone: payload.iana_timezone,
    primaryDomain: payload.primary_domain?.host,
    updatedAt: new Date().toISOString(),
  };

  await updateShop(shopDomain, updates);

  console.log(`🔄 Shop updated — synced data for ${shopDomain}`);

  return new NextResponse(null, { status: 200 });
}
