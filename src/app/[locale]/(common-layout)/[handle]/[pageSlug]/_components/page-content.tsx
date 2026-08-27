import { ClientOnly } from "@tanstack/react-router";
import { EyeIcon } from "lucide-react";
import type {
	CreateTranslation,
	CreateTranslationJob,
	GetTranslationJob,
	ScriptureDetail,
	SubmitTranslationVote,
} from "@/components/scripture/types";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { absoluteSiteUrl } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";
import type { PageInteractionState } from "@/server/page-interactions";
import type { ScriptureTreeNode } from "@/server/scripture-tree";
import { FloatingControls } from "../../../_components/floating-controls/floating-controls.client";
import { PageLikeButtonClient } from "../../../_components/page/page-like-button/client";
import { ChildPages } from "./child-pages/server";
import { ContentWithTranslations } from "./content-with-translations";
import { PageNavigation } from "./page-navigation/server";
import { PageViewCounter } from "./page-view-counter/client";

type PageContentProps = {
	authenticated: boolean;
	detail: ScriptureDetail;
	locale: string;
	onCreateTranslation?: CreateTranslation;
	onDeleteTranslation?: (translationId: string) => Promise<void>;
	onVote: SubmitTranslationVote;
	createTranslationJob?: CreateTranslationJob;
	getTranslationJob?: GetTranslationJob;
	childPages?: readonly ScriptureTreeNode[];
	pageInteractions?: Pick<
		PageInteractionState,
		"liked" | "likeCount" | "viewCount"
	>;
};

export function PageContent({
	authenticated,
	detail,
	locale,
	onCreateTranslation,
	onDeleteTranslation,
	onVote,
	createTranslationJob,
	getTranslationJob,
	childPages,
	pageInteractions,
}: PageContentProps) {
	const origin = getSiteOrigin();
	const ownerHandle = detail.ownerHandle;
	const articlePath = ownerHandle
		? `/${locale}/${ownerHandle}/${detail.slug}`
		: `/${locale}`;
	const articleUrl = absoluteSiteUrl(articlePath, origin);
	const authorUrl = ownerHandle
		? absoluteSiteUrl(`/${locale}/${ownerHandle}`, origin)
		: undefined;
	const description = detail.sourceText.trim().slice(0, 200);

	return (
		<article className="w-full prose dark:prose-invert prose-a:underline lg:prose-lg mx-auto mb-20">
			<ArticleJsonLd
				authorName={ownerHandle}
				authorUrl={authorUrl}
				description={description}
				headline={detail.title}
				inLanguage={detail.sourceLocale ?? locale}
				url={articleUrl}
			/>
			<BreadcrumbJsonLd
				items={[
					{ name: "Home", url: absoluteSiteUrl(`/${locale}`, origin) },
					...(ownerHandle && authorUrl
						? [{ name: ownerHandle, url: authorUrl }]
						: []),
					{ name: detail.title, url: articleUrl },
				]}
			/>
			<PageNavigation detail={detail} locale={locale} />
			<ContentWithTranslations
				authenticated={authenticated}
				createTranslationJob={createTranslationJob}
				detail={detail}
				getTranslationJob={getTranslationJob}
				locale={locale}
				onCreateTranslation={onCreateTranslation}
				onDeleteTranslation={onDeleteTranslation}
				onVote={onVote}
			/>
			<ChildPages pages={childPages} />
			<div className="not-prose mt-8 flex flex-wrap items-center gap-4">
				<EyeIcon aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
				<PageViewCounter
					initialCount={pageInteractions?.viewCount ?? 0}
					pageId={Number(detail.id)}
				/>
				<PageLikeButtonClient
					initialLikeCount={pageInteractions?.likeCount ?? 0}
					initialLiked={pageInteractions?.liked}
					pageId={Number(detail.id)}
					showCount
				/>
			</div>
			<ClientOnly fallback={null}>
				<FloatingControls
					annotationTypes={detail.segments
						.filter((segment) => segment.kind === "COMMENTARY")
						.map(() => ({ key: "COMMENTARY", label: "Commentary" }))
						.filter(
							(annotation, index, values) =>
								values.findIndex((item) => item.key === annotation.key) ===
								index,
						)}
					likeButton={
						<PageLikeButtonClient
							className="h-10 w-10 rounded-full"
							initialLikeCount={pageInteractions?.likeCount ?? 0}
							initialLiked={pageInteractions?.liked}
							pageId={Number(detail.id)}
							showCount={false}
						/>
					}
					sourceLocale={detail.sourceLocale ?? "pi"}
					userLocale={locale}
				/>
			</ClientOnly>
		</article>
	);
}
