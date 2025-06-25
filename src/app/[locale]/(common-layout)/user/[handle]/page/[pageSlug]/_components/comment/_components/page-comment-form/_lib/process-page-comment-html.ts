import { htmlToMdastWithSegments } from '@/app/[locale]/_lib/html-to-mdast-with-segments';
import { upsertPageCommentAndSegments } from '../_db/mutations.server';
export async function processPageCommentHtml(p: {
  pageCommentId?: number;
  parentId?: number;
  commentHtml: string;
  locale: string;
  currentUserId: string;
  pageId: number;
}) {
  const {
    pageCommentId,
    commentHtml,
    locale,
    currentUserId,
    pageId,
    parentId,
  } = p;
  const { mdastJson, segments } = await htmlToMdastWithSegments({
    html: commentHtml,
  });
  const pageComment = await upsertPageCommentAndSegments({
    pageId,
    pageCommentId,
    currentUserId,
    mdastJson,
    sourceLocale: locale,
    segments,
    parentId,
  });
  return pageComment;
}
