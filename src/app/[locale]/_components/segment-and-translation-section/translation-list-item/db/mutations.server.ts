import { prisma } from '@/lib/prisma';

export const deleteOwnTranslation = async (
  currentHandle: string,
  translationId: number
) => {
  const translation = await prisma.pageSegmentTranslation.findUnique({
    where: { id: translationId },
    select: { user: true },
  });
  if (!translation) {
    return { error: 'Translation not found' };
  }
  if (translation.user.handle !== currentHandle) {
    return { error: 'Unauthorized' };
  }
  await prisma.pageSegmentTranslation.update({
    where: { id: translationId },
    data: { isArchived: true },
  });
};
