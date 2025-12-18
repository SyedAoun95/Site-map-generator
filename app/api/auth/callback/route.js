import crypto from 'crypto';
import { NextResponse } from 'next/server';
import axios from 'axios';
import { storeShop } from '@/lib/db';

export const dynamic = 'force-dynamic';

function verifyHmac(queryParams, hmac, secret) {
  const params = { ...queryParams };
  delete params.hmac;
  delete params.signature;

  const sorted = Object.keys(params)
    .sort()
    .map((key) => {
      const value = Array.isArray(params[key]) ? params[key].join(',') : params[key];
      return `${key}=${value}`;
    })
    .join('&');

  const hash = crypto.createHmac('sha256', secret).update(sorted).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

async function registerUninstallWebhook(shop, accessToken) {
  return axios.post(
    `https://${shop}/admin/api/2024-01/webhooks.json`,
    {
      webhook: {
        topic: 'app/uninstalled',
        address: `${process.env.SHOPIFY_HOST}/api/webhooks/app-uninstalled`,
        format: 'json',
      },
    },
    {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function GET(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  const shop = searchParams.get('shop');
  const code = searchParams.get('code');
  const hmac = searchParams.get('hmac');
  const state = searchParams.get('state');

  if (!shop || !code || !hmac) {
    return NextResponse.json({ error: 'Missing required OAuth parameters' }, { status: 400 });
  }

  // Validate CSRF state
  const cookiesHeader = request.headers.get('cookie') || '';
  const stateCookie = cookiesHeader.split(';').map(c => c.trim()).find(c => c.startsWith('shopify_oauth_state='));
  const storedState = stateCookie ? stateCookie.split('=')[1] : null;

  if (!state || !storedState || state !== storedState) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  // Verify HMAC
  const queryParamsObj = {};
  for (const [key, value] of searchParams.entries()) queryParamsObj[key] = value;

  if (!verifyHmac(queryParamsObj, hmac, process.env.SHOPIFY_API_SECRET)) {
    return NextResponse.json({ error: 'HMAC validation failed' }, { status: 400 });
  }

  // Exchange code for access token
  try {
    const tokenResponse = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    });

    const { access_token, scope } = tokenResponse.data;

    // Store RAW token
    storeShop(shop, access_token, scope);

    // Register uninstall webhook
    try { await registerUninstallWebhook(shop, access_token); } 
    catch (e) { console.error('Webhook failed', e?.response?.data || e.message); }

    // Redirect to app
    const redirectUrl = `${process.env.SHOPIFY_HOST}/?shop=${encodeURIComponent(shop)}`;
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('shopify_oauth_state', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
    return response;

  } catch (err) {
    console.error('OAuth token exchange failed:', err?.response?.data || err.message);
    return NextResponse.json({ error: 'Failed to obtain access token' }, { status: 500 });
  }
}
