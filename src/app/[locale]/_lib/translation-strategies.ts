import type { TranslateJobParams } from '@/features/translate/types';
import type {
  PageCommentTranslationParams,
  PageTranslationParams,
  TranslationStrategy,
} from './handle-auto-translation';
export const pageStrategy: TranslationStrategy<PageTranslationParams> = {
  async createTranslationJob(deps, { currentUserId, pageId }, locale) {
    return deps.createTranslationJob({
      userId: currentUserId,
      pageId,
      locale,
      aiModel: 'gemini-2.0-flash',
    });
  },

  async buildParamsForTranslationAPI(
    deps,
    { currentUserId, pageId, geminiApiKey },
    job,
    locale
  ): Promise<TranslateJobParams> {
    const page = await deps.fetchPageWithPageSegments(pageId);
    if (!page) throw new Error('Page not found');

    return {
      translationJobId: job.id,
      geminiApiKey,
      aiModel: job.aiModel,
      userId: currentUserId,
      pageId,
      targetLocale: locale,
      targetContentType: 'page',
      title: page.title,
      numberedElements: page.pageSegments.map(({ number, text }) => ({
        number,
        text,
      })),
    };
  },
};

export const pageCommentStrategy: TranslationStrategy<PageCommentTranslationParams> =
  {
    async createTranslationJob(deps, { currentUserId, pageId }, locale) {
      return deps.createTranslationJob({
        userId: currentUserId,
        pageId,
        locale,
        aiModel: 'gemini-2.0-flash',
      });
    },

    async buildParamsForTranslationAPI(
      deps,
      { currentUserId, pageId, pageCommentId, geminiApiKey },
      job,
      locale
    ): Promise<TranslateJobParams> {
      const page = await deps.fetchPageWithTitleAndComments(pageId);
      if (!page) throw new Error('Page not found');

      const comment = page.pageComments.find((c) => c.id === pageCommentId);
      if (!comment) throw new Error('Comment not found');

      return {
        translationJobId: job.id,
        geminiApiKey,
        aiModel: job.aiModel,
        userId: currentUserId,
        pageId,
        targetLocale: locale,
        targetContentType: 'pageComment',
        title: page.title,
        pageCommentId,
        numberedElements: [
          ...comment.pageCommentSegments.map(({ number, text }) => ({
            number,
            text,
          })),
          { number: 0, text: page.title },
        ],
      };
    },
  };
