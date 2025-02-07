'use client';

import { LikeButton } from "@/app/[locale]/components/like-button/like-button";
import { MessageCircle } from "lucide-react";
import { useState } from 'react';
import { PageCommentList } from "../comment/components/PageCommentList";
import { PageCommentForm } from "../comment/components/page-comment-form";
import { getPageData } from "../page";
import { ContentWithTranslations } from "./ContentWithTranslations";
import { FloatingControls } from "./floating-controls";
import { TranslateActionSection } from "./translate-button/translate-action-section";

interface PageContentWrapperProps {
  pageData: Awaited<ReturnType<typeof getPageData>>;
  likeCount: number;
  isLikedByUser: boolean;
  pageCommentsWithUser: any; // type定義必要
  pageCommentsCount: number;
  currentUser: any; // type定義必要
  locale: string;
}

export function PageContentWrapper({
  pageData,
  likeCount,
  isLikedByUser,
  pageCommentsWithUser,
  pageCommentsCount,
  currentUser,
  locale
}: PageContentWrapperProps) {
  const [showOriginal, setShowOriginal] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const {
    pageWithTranslations,
    pageSegmentTitleWithTranslations,
    sourceTitleWithBestTranslationTitle
  } = pageData;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <article className="w-full prose dark:prose-invert prose-a:underline prose-a:decoration-dotted sm:prose lg:prose-lg mx-auto px-4 mb-20">
        <ContentWithTranslations
          pageWithTranslations={pageWithTranslations}
          pageSegmentWithTranslations={pageSegmentTitleWithTranslations}
          currentHandle={currentUser?.handle}
          hasGeminiApiKey={hasGeminiApiKey}
          userAITranslationInfo={userAITranslationInfo}
          locale={locale}
          existLocales={pageWithTranslations.existLocales}
          showOriginal={showOriginal}
          showTranslation={showTranslation}
        />
      </article>

      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <LikeButton
            liked={isLikedByUser}
            likeCount={likeCount}
            slug={pageWithTranslations.page.slug}
            showCount
          />
          <MessageCircle className="w-6 h-6" strokeWidth={1.5} />
          <span>{pageCommentsCount}</span>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 py-2">
            <h2 className="text-2xl font-bold">Comments</h2>
            <TranslateActionSection
              pageId={pageWithTranslations.page.id}
              currentHandle={currentUser?.handle}
              userAITranslationInfo={userAITranslationInfo}
              hasGeminiApiKey={hasGeminiApiKey}
              sourceLocale={pageWithTranslations.page.sourceLocale}
              locale={locale}
              existLocales={pageWithTranslations.existLocales}
              intent="translateComment"
            />
          </div>
          <PageCommentList
            pageCommentsWithUser={pageCommentsWithUser}
            currentUserId={currentUser?.id}
            currentHandle={currentUser?.handle}
            showOriginal={showOriginal}
            showTranslation={showTranslation}
            locale={locale}
          />
        </div>
        <PageCommentForm
          pageId={pageWithTranslations.page.id}
          currentHandle={currentUser?.handle}
        />
      </div>

      <FloatingControls
        showOriginal={showOriginal}
        showTranslation={showTranslation}
        onToggleOriginal={() => setShowOriginal(!showOriginal)}
        onToggleTranslation={() => setShowTranslation(!showTranslation)}
        liked={isLikedByUser}
        likeCount={likeCount}
        slug={pageWithTranslations.page.slug}
        shareUrl={shareUrl}
        shareTitle={sourceTitleWithBestTranslationTitle}
      />
    </div>
  );
} 