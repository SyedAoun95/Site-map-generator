import { NextResponse } from 'next/server';
import { getAccessToken } from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const shop = searchParams.get('shop');

  if (!shop) {
    return NextResponse.json(
      { error: 'Missing shop parameter' },
      { status: 400 }
    );
  }

  const token = getAccessToken(shop);

  if (!token) {
    return NextResponse.json(
      { error: 'No access token found for shop' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    shop,
    hasAccessToken: true,
  });
}
