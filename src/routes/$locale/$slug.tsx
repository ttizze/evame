import { createFileRoute, notFound } from "@tanstack/react-router";
import { ScriptureReader } from "@/components/scripture/scripture-reader";
import type { VoteResult } from "@/components/scripture/types";
import { isSupportedLocale } from "@/domain/locales";
import {
	createTranslation,
	createTranslationJob,
	getScripture,
	getTranslationJob,
	voteTranslation,
} from "./-scripture-data";

export const Route = createFileRoute("/$locale/$slug")({
	loader: ({ params }) => {
		if (!isSupportedLocale(params.locale)) throw notFound();
		return getScripture({ data: { locale: params.locale, slug: params.slug } });
	},
	component: ScriptureDetailPage,
});

function ScriptureDetailPage() {
	const { locale } = Route.useParams();
	const detail = Route.useLoaderData();

	if (!detail) {
		return (
			<main className="mx-auto min-h-screen max-w-3xl px-4 py-16 sm:px-6">
				<h1 className="text-2xl font-semibold text-slate-950">
					Scripture not found
				</h1>
				<p className="mt-3 text-slate-600">
					The requested text is not available in this collection.
				</p>
				<a
					className="mt-6 inline-flex text-sm font-medium text-slate-700 underline underline-offset-4"
					href={`/${locale}`}
				>
					Back to the collection
				</a>
			</main>
		);
	}

	return (
		<main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 sm:py-12">
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
