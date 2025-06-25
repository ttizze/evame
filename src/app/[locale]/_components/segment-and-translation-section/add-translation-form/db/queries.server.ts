import { prisma } from '@/lib/prisma';

export async function getPageSegmentById(segmentId: number) {
  return await prisma.pageSegment.findUnique({
    where: { id: segmentId },
    include: {
      page: {
        select: {
          slug: true,
        },
      },
    },
  });
}

export async function getCommentSegmentById(segmentId: number) {
  return await prisma.pageCommentSegment.findUnique({
    where: { id: segmentId },
    include: {
      pageComment: {
        select: {
          page: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });
}
