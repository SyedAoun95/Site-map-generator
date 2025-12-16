import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { deleteShop } from '@/lib/db';

export const dynamic = 'force-dynamic';

function verifyWebhookHmac(rawBody, hmacHeader, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(hmacHeader)
  );
}

export async function POST(request) {
  const rawBody = await request.text();
  const hmac = request.headers.get('x-shopify-hmac-sha256');
  const topic = request.headers.get('x-shopify-topic');
  const shop = request.headers.get('x-shopify-shop-domain');

  if (topic !== 'app/uninstalled') {
    return NextResponse.json({ ok: true });
  }

  const secret = process.env.SHOPIFY_API_SECRET;

  if (!verifyWebhookHmac(rawBody, hmac, secret)) {
    console.error('❌ Invalid webhook HMAC');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ Clean up
  deleteShop(shop);

  console.log(`🗑 App uninstalled — cleaned data for ${shop}`);

  return NextResponse.json({ success: true });
}
