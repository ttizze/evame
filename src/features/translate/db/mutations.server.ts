import type { TranslationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
export async function getOrCreateAIUser(name: string): Promise<string> {
  const user = await prisma.user.upsert({
    where: { handle: name },
    update: {},
    create: {
      handle: name,
      name,
      isAI: true,
      image: '',
      email: `${name}@ai.com`,
    },
  });
  return user.id;
}

export async function updateTranslationJob(
  translationJobId: number,
  status: TranslationStatus,
  progress: number,
  userId?: string,
  pageId?: number
) {
  return await prisma.translationJob.update({
    where: {
      id: translationJobId,
    },
    data: {
      status,
      progress,
      userId,
      pageId,
    },
  });
}
