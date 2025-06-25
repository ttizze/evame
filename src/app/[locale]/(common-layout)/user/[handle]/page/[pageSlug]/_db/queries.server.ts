import { prisma } from '@/lib/prisma';

export async function fetchLatestUserTranslationJob(
  pageId: number,
  userId: string
) {
  return await prisma.translationJob.findFirst({
    where: { pageId, userId },
    orderBy: { createdAt: 'desc' },
  });
}
