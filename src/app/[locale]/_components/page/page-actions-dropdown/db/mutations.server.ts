import { prisma } from '@/lib/prisma';

export async function togglePagePublicStatus(
  pageId: number,
  currentUserId: string
) {
  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) {
    throw new Error('Page not found');
  }
  if (page.userId !== currentUserId) {
    throw new Error('Unauthorized');
  }
  return prisma.page.update({
    where: { id: pageId, userId: currentUserId },
    data: {
      status: page.status === 'PUBLIC' ? 'DRAFT' : 'PUBLIC',
    },
  });
}
