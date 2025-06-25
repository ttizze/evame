import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { pickBestPerLocale } from './_lib/pick-best-per-locale';

export async function GET(req: NextRequest) {
  /* ① クエリパラメータを 1 回でバリデート */
  const Params = z
    .object({
      pageSlug: z.string().optional(),
    })
    .refine((p) => p.pageSlug, {
      message: 'pageSlug is required',
    });

  /* ② ここでパース失敗なら 400 を返す */
  const { pageSlug } = Params.parse(
    Object.fromEntries(req.nextUrl.searchParams)
  );

  /* ③ 片方だけを使って DB に問い合わせ */
  if (pageSlug) {
    const page = await prisma.page.findUnique({
      where: { slug: pageSlug },
      select: { sourceLocale: true, translationJobs: true },
    });
    if (!page)
      return NextResponse.json({ message: 'page not found' }, { status: 404 });

    return NextResponse.json(
      {
        sourceLocale: page.sourceLocale,
        translationJobs: pickBestPerLocale(page.translationJobs),
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { message: 'pageSlug  is required' },
    { status: 400 }
  );
}
