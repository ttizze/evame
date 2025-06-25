'use server';

import { z } from 'zod';
import { createActionFactory } from '@/app/[locale]/_action/create-action-factory';
import { getLocaleFromHtml } from '@/app/[locale]/_lib/get-locale-from-html';
import type { ActionResponse } from '@/app/types';
import { processPageHtml } from '../_lib/process-page-html';

/* ────────────── 入力スキーマ ────────────── */
const formSchema = z.object({
  pageId: z.coerce.number().optional(),
  pageSlug: z.string(),
  userLocale: z.string(),
  title: z.string().min(1).max(100),
  pageContent: z.string().min(1),
});

/* ────────────── 型 ────────────── */
type SuccessData = undefined;
export type EditPageContentActionState = ActionResponse<
  SuccessData,
  z.infer<typeof formSchema>
>;

/* ────────────── アクション ────────────── */
export const editPageContentAction = createActionFactory<
  typeof formSchema,
  SuccessData,
  SuccessData
>({
  inputSchema: formSchema,

  async create(input, userId) {
    const { pageId, pageSlug, userLocale, title, pageContent } = input;

    const sourceLocale = await getLocaleFromHtml(pageContent, userLocale);

    await processPageHtml({
      title,
      html: pageContent,
      pageId,
      pageSlug,
      userId,
      sourceLocale,
    });

    return {
      success: true,
      data: undefined,
    };
  },

  buildRevalidatePaths: (i, handle) => [`/user/${handle}/page/${i.pageSlug}`],

  buildResponse: (d) => ({ success: true, data: undefined }),
});
