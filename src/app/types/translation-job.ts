import { z } from 'zod';

export const translationJobForToastSchema = z.object({
  id: z.number(),
  locale: z.string(),
  status: z.string(),
  progress: z.number(),
  error: z.string(),
  page: z.object({
    slug: z.string(),
    user: z.object({
      handle: z.string(),
    }),
  }),
});

export const translationJobForTranslationAPI = z.object({
  id: z.number(),
  locale: z.string(),
  status: z.string(),
  progress: z.number(),
  error: z.string(),
  aiModel: z.string(),
  pageId: z.number(),
  page: z.object({
    slug: z.string(),
    user: z.object({
      handle: z.string(),
    }),
  }),
});

export type TranslationJobForToast = z.infer<
  typeof translationJobForToastSchema
>;
export type TranslationJobForTranslationAPI = z.infer<
  typeof translationJobForTranslationAPI
>;
