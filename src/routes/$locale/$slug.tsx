import { createFileRoute, notFound } from "@tanstack/react-router";
import { getScriptureCopy } from "@/components/scripture/copy";
import { ScriptureReader } from "@/components/scripture/scripture-reader";
import type { VoteResult } from "@/components/scripture/types";
import { isSupportedLocale } from "@/domain/locales";
import { getSeoCopy } from "@/seo/copy";
import { buildLocalizedHead } from "@/seo/metadata";
import { getSiteOrigin } from "@/seo/site-origin";
import { scripturePath } from "@/seo/sitemap";
import {
	createTranslation,
	createTranslationJob,
	deleteTranslation,
	getScripture,
	getTranslationJob,
	voteTranslation,
} from "./-scripture-data";

export const Route = createFileRoute("/$locale/$slug")({
	loader: ({ params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
		return getScripture({ data: { locale: params.locale, slug: params.slug } });
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
			path: scripturePath(locale, params.slug),
			pathForLocale: (targetLocale) => scripturePath(targetLocale, params.slug),
			title,
			description,
			type: loaderData ? "article" : "website",
			scriptureTitle: loaderData?.title,
			indexable: Boolean(loaderData),
		});
	},
	component: ScriptureDetailPage,
});

function ScriptureDetailPage() {
	const { locale } = Route.useParams();
	const detail = Route.useLoaderData();
	const copy = getScriptureCopy(locale);

	if (!detail) {
		return (
			<main className="mx-auto min-h-screen max-w-3xl px-4 py-16 text-foreground sm:px-6">
				<h1 className="text-2xl font-semibold">{copy.notFoundTitle}</h1>
				<p className="mt-3 text-muted-foreground">{copy.notFoundDescription}</p>
				<a
					className="mt-6 inline-flex text-sm font-medium underline underline-offset-4"
					href={`/${locale}`}
				>
					{copy.backToCollection}
				</a>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
			<ScriptureReader
				authenticated={detail.authenticated ?? false}
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
			/>
		</main>
	);
}
