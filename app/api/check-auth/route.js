import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      return NextResponse.json({ authenticated: false });
    }

    const token = getAccessToken(shop);
    return NextResponse.json({ authenticated: !!token });
  } catch (err) {
    console.error('check-auth error:', err);
    return NextResponse.json({ authenticated: false });
  }
}
