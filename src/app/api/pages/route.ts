export const revalidate = 86_400;

import { NextResponse } from 'next/server';
import { fetchPagesWithUserAndTranslation } from './db/queries.server';

export async function GET() {
  try {
    const pages = await fetchPagesWithUserAndTranslation();

    return NextResponse.json(pages, {
      headers: {
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
