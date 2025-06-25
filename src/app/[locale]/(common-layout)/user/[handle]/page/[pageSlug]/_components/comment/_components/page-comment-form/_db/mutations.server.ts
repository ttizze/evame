import type { PageComment, Prisma } from '@prisma/client';
import type { SegmentDraft } from '@/app/[locale]/_lib/remark-hash-and-segments';
import { prisma } from '@/lib/prisma';
export async function upsertPageCommentAndSegments(p: {
  pageId: number;
  pageCommentId?: number;
  parentId?: number;
  currentUserId: string;
  sourceLocale: string;
  mdastJson: Prisma.InputJsonValue;
  segments: SegmentDraft[];
}) {
  let pageComment: PageComment;
  if (p.pageCommentId) {
    pageComment = await prisma.pageComment.update({
      where: { id: p.pageCommentId, userId: p.currentUserId },
      data: { mdastJson: p.mdastJson, locale: p.sourceLocale },
    });
  } else {
    pageComment = await prisma.pageComment.create({
      data: {
        pageId: p.pageId,
        userId: p.currentUserId,
        mdastJson: p.mdastJson,
        locale: p.sourceLocale,
        parentId: p.parentId,
      },
    });
  }

  await syncPageCommentSegments(pageComment.id, p.segments);
  return pageComment;
}

/** 1ページ分のセグメントを同期 */
async function syncPageCommentSegments(
  pageCommentId: number,
  drafts: SegmentDraft[]
) {
  const existing = await prisma.pageCommentSegment.findMany({
    where: { pageCommentId },
    select: { textAndOccurrenceHash: true },
  });
  const stale = new Set(existing.map((e) => e.textAndOccurrenceHash as string));

  await prisma.$transaction(async (tx) => {
    // A. 並び避難（既存あれば）
    if (existing.length) {
      await tx.pageCommentSegment.updateMany({
        where: { pageCommentId },
        data: { number: { increment: 1_000_000 } },
      });
    }

    // B. UPSERT を **適度なバッチ & 逐次 await** で安定
    const CHUNK = 200;
    for (let i = 0; i < drafts.length; i += CHUNK) {
      const chunk = drafts.slice(i, i + CHUNK);
      await Promise.all(
        chunk.map((d) =>
          tx.pageCommentSegment.upsert({
            where: {
              pageCommentId_textAndOccurrenceHash: {
                pageCommentId,
                textAndOccurrenceHash: d.hash,
              },
            },
            update: { text: d.text, number: d.number },
            create: {
              pageCommentId,
              text: d.text,
              number: d.number,
              textAndOccurrenceHash: d.hash,
            },
          })
        )
      );
      for (const d of chunk) {
        stale.delete(d.hash);
      }
    }

    // C. 余った行を一括削除
    if (stale.size) {
      await tx.pageCommentSegment.deleteMany({
        where: { pageCommentId, textAndOccurrenceHash: { in: [...stale] } },
      });
    }
  });
}

export async function createNotificationPageComment(
  actorId: string,
  userId: string,
  pageCommentId: number
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: 'PAGE_COMMENT',
        pageCommentId,
        actorId,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error in createNotificationPageComment:', error);
    throw error;
  }
}
