import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPageInteractionState } from "@/app/[locale]/_db/page-interactions";
import { getChildPages } from "@/app/[locale]/_db/page-tree";
import ScripturePage from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/page";
import { CommonLayout } from "@/app/[locale]/(common-layout)/layout";
import type { VoteResult } from "@/components/scripture/types";
import { isSupportedLocale } from "@/domain/locales";
import { getSeoCopy } from "@/seo/copy";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";
import { legacyScripturePath } from "@/seo/sitemap";
import {
	createTranslation,
	createTranslationJob,
	deleteTranslation,
	getScripture,
	getTranslationJob,
	voteTranslation,
} from "../-scripture-data";

export const Route = createFileRoute("/$locale/$handle/$pageSlug")({
	loader: async ({ params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
		const detail = await getScripture({
			data: { locale: params.locale, slug: params.pageSlug },
		});
		if (!detail || detail.ownerHandle !== params.handle) throw notFound();
		const childPages = await getChildPages({
			data: { locale: params.locale, parentId: Number(detail.id) },
		});
		const pageInteractions = await getPageInteractionState({
			data: { pageId: Number(detail.id) },
		});
		return { ...detail, childPages, pageInteractions };
	},
	head: ({ params, loaderData }) => {
		const locale = isSupportedLocale(params.locale) ? params.locale : "en";
		const copy = getSeoCopy(locale);
		const title = loaderData
			? `${loaderData.title} · ${copy.readerLabel}`
			: copy.notFoundTitle;
		const description = loaderData
			? copy.readerDescription
			: copy.notFoundDescription;
		return buildLocalizedHead({
			origin: getSiteOrigin(),
			locale,
			path: legacyScripturePath(locale, params.handle, params.pageSlug),
			pathForLocale: (targetLocale) =>
				legacyScripturePath(targetLocale, params.handle, params.pageSlug),
			title,
			description,
			type: loaderData ? "article" : "website",
			scriptureTitle: loaderData?.title,
			indexable: Boolean(loaderData),
		});
	},
	component: LegacyScriptureDetailPage,
});

function LegacyScriptureDetailPage() {
	const { locale } = Route.useParams();
	const detail = Route.useLoaderData();

	return (
		<CommonLayout locale={locale}>
			<ScripturePage
				authenticated={detail.authenticated ?? false}
				childPages={detail.childPages}
				createTranslationJob={async (input) =>
					createTranslationJob({
						data: {
							locale: input.locale,
							...(input.model ? { model: input.model } : {}),
							scriptureId: Number(input.scriptureId),
						},
					})
				}
				detail={detail}
				getTranslationJob={(jobId) => getTranslationJob({ data: { jobId } })}
				locale={locale}
				onCreateTranslation={async (input) =>
					createTranslation({
						data: {
							locale: input.locale,
							segmentId: Number(input.segmentId),
							text: input.text,
						},
					})
				}
				onDeleteTranslation={async (translationId) => {
					await deleteTranslation({
						data: { translationId: Number(translationId) },
					});
				}}
				onVote={async ({
					candidateId,
					currentVote,
					value,
				}): Promise<VoteResult> => {
					if (value === "remove") {
						if (typeof currentVote !== "boolean") {
							throw new Error("現在の投票状態を確認できません");
						}
						return voteTranslation({
							data: {
								isUpvote: currentVote,
								translationId: Number(candidateId),
							},
						});
					}
					return voteTranslation({
						data: {
							isUpvote: value === "up",
							translationId: Number(candidateId),
						},
					});
				}}
				pageInteractions={detail.pageInteractions}
			/>
		</CommonLayout>
	);
}
