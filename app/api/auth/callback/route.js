import crypto from 'crypto';
import { NextResponse } from 'next/server';
import axios from 'axios';
import { storeShop } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Verify Shopify HMAC
 */
function verifyHmac(queryParams, hmac, secret) {
  const params = { ...queryParams };
  delete params.hmac;
  delete params.signature;

  const sorted = Object.keys(params)
    .sort()
    .map((key) => {
      const value = Array.isArray(params[key])
        ? params[key].join(',')
        : params[key];
      return `${key}=${value}`;
    })
    .join('&');
    

  const hash = crypto
    .createHmac('sha256', secret)
    .update(sorted)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

/**
 * Register app/uninstalled webhook
 */
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
    return NextResponse.json(
      { error: 'Missing required OAuth parameters' },
      { status: 400 }
    );
  }

  /**
   * 1️⃣ Validate OAuth state (CSRF protection)
   */
  const cookiesHeader = request.headers.get('cookie') || '';
  const stateCookie = cookiesHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith('shopify_oauth_state='));

  const storedState = stateCookie ? stateCookie.split('=')[1] : null;

  if (!state || !storedState || state !== storedState) {
    return NextResponse.json(
      { error: 'Invalid OAuth state' },
      { status: 400 }
    );
  }

  /**
   * 2️⃣ Verify Shopify HMAC
   */
  const queryParamsObj = {};
  for (const [key, value] of searchParams.entries()) {
    queryParamsObj[key] = value;
  }

  const apiSecret = process.env.SHOPIFY_API_SECRET;

  if (!verifyHmac(queryParamsObj, hmac, apiSecret)) {
    return NextResponse.json(
      { error: 'HMAC validation failed' },
      { status: 400 }
    );
  }

  /**
   * 3️⃣ Exchange authorization code for access token
   */
  try {
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const { access_token, scope } = tokenResponse.data;

    /**
     * 4️⃣ Store token securely
     */
    const stored = storeShop(shop, access_token, scope);

    if (!stored) {
      console.error('❌ Failed to store shop credentials');
    }

    /**
     * 5️⃣ Register uninstall webhook (MANDATORY)
     */
    try {
      await registerUninstallWebhook(shop, access_token);
      console.log('🔔 Uninstall webhook registered');
    } catch (e) {
      console.error(
        '⚠️ Failed to register uninstall webhook',
        e?.response?.data || e.message
      );
    }

    /**
     * 6️⃣ Redirect to app UI
     */
    const host = process.env.SHOPIFY_HOST;
    const redirectUrl = `${host}/?shop=${encodeURIComponent(shop)}`;

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('shopify_oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error(
      'Error exchanging code for access token:',
      err?.response?.data || err.message
    );
    return NextResponse.json(
      { error: 'Failed to obtain access token' },
      { status: 500 }
    );
  }
}
