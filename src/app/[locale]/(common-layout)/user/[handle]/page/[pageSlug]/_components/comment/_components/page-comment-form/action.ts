'use server';
import { z } from 'zod';
import { createActionFactory } from '@/app/[locale]/_action/create-action-factory';
import { getPageById } from '@/app/[locale]/_db/queries.server';
import { getLocaleFromHtml } from '@/app/[locale]/_lib/get-locale-from-html';
import { handlePageCommentAutoTranslation } from '@/app/[locale]/_lib/handle-auto-translation';
import type { ActionResponse } from '@/app/types';
import type { TranslationJobForToast } from '@/app/types/translation-job';
import { createNotificationPageComment } from './_db/mutations.server';
import { processPageCommentHtml } from './_lib/process-page-comment-html';

export type CommentActionResponse = ActionResponse<
  { translationJobs: TranslationJobForToast[] },
  {
    pageId: number;
    userLocale: string;
    content: string;
    parentId?: number;
    pageCommentId?: number;
  }
>;
/* Success 用データ型 ───────────── */
type CommentSuccessData = { translationJobs: TranslationJobForToast[] };

/* create が内部で使う型（公開しない） */
type CreateResult = CommentSuccessData & { revalidatePath: string };

export const commentAction = createActionFactory<
  // 1. Input schema
  z.ZodTypeAny,
  // 2. TCreateResult
  CreateResult,
  // 3. TResponseData
  CommentSuccessData
>({
  inputSchema: z.object({
    pageId: z.coerce.number(),
    userLocale: z.string(),
    content: z.string().min(1, 'Comment cannot be empty'),
    parentId: z.coerce.number().optional(),
    pageCommentId: z.coerce.number().optional(),
  }),
  async create(input, currentUserId) {
    const { content, pageId, parentId, userLocale, pageCommentId } = input;
    const page = await getPageById(pageId);
    if (!page) {
      return {
        success: false,
        message: 'Page not found',
      };
    }
    const locale = await getLocaleFromHtml(content, userLocale);
    const pageComment = await processPageCommentHtml({
      pageCommentId: pageCommentId ?? undefined,
      commentHtml: content,
      locale,
      currentUserId,
      pageId,
      parentId,
    });
    await createNotificationPageComment(
      currentUserId,
      page.userId,
      pageComment.id
    );
    const results = await handlePageCommentAutoTranslation({
      currentUserId,
      pageCommentId: pageComment.id,
      pageId,
      sourceLocale: locale,
      geminiApiKey: process.env.GEMINI_API_KEY ?? '',
      targetLocales: ['en', 'zh'],
    });
    return {
      success: true,
      data: {
        translationJobs: results,
        revalidatePath: `/user/${page.user.handle}/page/${page.slug}`,
      },
    };
  },

  buildRevalidatePaths: (_input, _userHandle, result) => [
    result.revalidatePath ?? '',
  ],
  buildResponse: (result) => ({
    success: true,
    data: {
      translationJobs: result.translationJobs,
    },
  }),
});
