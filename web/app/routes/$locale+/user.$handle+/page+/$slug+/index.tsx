import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { data } from "@remix-run/node";
import type { MetaFunction } from "@remix-run/react";
import { useActionData, useLoaderData } from "@remix-run/react";
import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { getTranslateUserQueue } from "~/features/translate/translate-user-queue";
import i18nServer from "~/i18n.server";
import { PageCommentForm } from "~/routes/$locale+/user.$handle+/page+/$slug+/comment/components/PageCommentForm";
import { PageCommentList } from "~/routes/$locale+/user.$handle+/page+/$slug+/comment/components/PageCommentList";
import { fetchGeminiApiKeyByHandle } from "~/routes/functions/queries.server";
import { LikeButton } from "~/routes/resources+/like-button";
import { authenticator } from "~/utils/auth.server";
import { ensureGuestId } from "~/utils/ensureGuestId.server";
import { commitSession } from "~/utils/session.server";
import { ContentWithTranslations } from "./components/ContentWithTranslations";
import { FloatingControls } from "./components/FloatingControls";
import { TranslateActionSection } from "./components/translateButton/TranslateActionSection";
import { createUserAITranslationInfo } from "./functions/mutations.server";
import {
	fetchIsLikedByUser,
	fetchLatestUserAITranslationInfo,
	fetchLikeCount,
	fetchPageCommentsCount,
	fetchPageCommentsWithUser,
	fetchPageWithPageSegments,
	fetchPageWithTitleAndComments,
	fetchPageWithTranslations,
} from "./functions/queries.server";
import { getBestTranslation } from "./utils/getBestTranslation";
import { stripHtmlTags } from "./utils/stripHtmlTags";
export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (!data) {
		return [{ title: "Page Not Found" }];
	}

	const { pageWithTranslations, sourceTitleWithBestTranslationTitle } = data;

	const description = stripHtmlTags(pageWithTranslations.page.content).slice(
		0,
		200,
	);
	const firstImageMatch = pageWithTranslations.page.content.match(
		/<img[^>]+src="([^">]+)"/,
	);
	const imageUrl = firstImageMatch
		? firstImageMatch[1]
		: pageWithTranslations.user.image;

	const alternateLinks = data.existLocales
		.filter((locale: string) => locale !== data.locale)
		.map((locale: string) => ({
			tagName: "link",
			rel: "alternate",
			hrefLang: locale,
			href: `/${locale}/user/${data.pageWithTranslations.user.handle}/page/${data.pageWithTranslations.page.slug}`,
		}));

	return [
		{ title: sourceTitleWithBestTranslationTitle },
		{ name: "description", content: description },
		{ property: "og:type", content: "article" },
		{ property: "og:title", content: sourceTitleWithBestTranslationTitle },
		{ property: "og:description", content: description },
		{ property: "og:image", content: imageUrl },
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: sourceTitleWithBestTranslationTitle },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: imageUrl },
		...alternateLinks,
	];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	let locale = params.locale;
	if (!locale) {
		locale = (await i18nServer.getLocale(request)) || "en";
	}
	const { slug } = params;
	if (!slug) {
		throw new Response("Missing slug", { status: 400 });
	}

	const currentUser = await authenticator.isAuthenticated(request);
	const { session, guestId } = await ensureGuestId(request);

	const geminiApiKey = await fetchGeminiApiKeyByHandle(
		currentUser?.handle ?? "",
	);
	const hasGeminiApiKey = !!geminiApiKey;
	const pageWithTranslations = await fetchPageWithTranslations(
		slug,
		locale,
		currentUser?.id,
	);

	if (!pageWithTranslations) {
		throw new Response("Failed to fetch article", { status: 500 });
	}
	const isOwner = pageWithTranslations?.user.handle === currentUser?.handle;
	if (
		pageWithTranslations.page.status === "ARCHIVE" ||
		(!isOwner && pageWithTranslations.page.status !== "PUBLIC")
	) {
		throw new Response("Page not found", { status: 404 });
	}
	const pageSegmentTitleWithTranslations =
		pageWithTranslations.pageSegmentWithTranslations.filter(
			(item) => item.pageSegment?.number === 0,
		)[0];
	const bestTranslationTitle = getBestTranslation(
		pageSegmentTitleWithTranslations.pageSegmentTranslationsWithVotes,
	);
	const userAITranslationInfo = await fetchLatestUserAITranslationInfo(
		pageWithTranslations.page.id,
		currentUser?.id ?? 0,
		locale,
	);
	const sourceTitleWithBestTranslationTitle = bestTranslationTitle
		? `${pageSegmentTitleWithTranslations.pageSegment.text} - ${bestTranslationTitle.pageSegmentTranslation.text}`
		: pageSegmentTitleWithTranslations.pageSegment.text;

	const [likeCount, isLikedByUser, pageCommentsWithUser, pageCommentsCount] =
		await Promise.all([
			fetchLikeCount(pageWithTranslations.page.id),
			fetchIsLikedByUser(
				pageWithTranslations.page.id,
				currentUser?.id,
				guestId,
			),
			fetchPageCommentsWithUser(pageWithTranslations.page.id, locale),
			fetchPageCommentsCount(pageWithTranslations.page.id),
		]);

	const headers = new Headers();
	headers.set("Set-Cookie", await commitSession(session));
	return data(
		{
			locale,
			pageWithTranslations,
			currentUser,
			hasGeminiApiKey,
			userAITranslationInfo,
			pageSegmentTitleWithTranslations,
			sourceTitleWithBestTranslationTitle,
			likeCount,
			isLikedByUser,
			pageCommentsWithUser,
			pageCommentsCount,
			existLocales: pageWithTranslations.existLocales,
		},
		{
			headers,
		},
	);
}
export enum TranslationIntent {
	TRANSLATE_PAGE = "translatePage",
	TRANSLATE_COMMENT = "translateComment",
}
const translateSchema = z.object({
	pageId: z.number(),
	aiModel: z.string().min(1, "モデルを選択してください"),
	intent: z.enum([
		TranslationIntent.TRANSLATE_PAGE,
		TranslationIntent.TRANSLATE_COMMENT,
	]),
});

export async function action({ request, params }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});

	const submission = parseWithZod(await request.formData(), {
		schema: translateSchema,
	});
	console.log(submission);
	const geminiApiKey = await fetchGeminiApiKeyByHandle(currentUser.handle);
	if (!geminiApiKey) {
		throw new Response("Gemini API key is not set", { status: 404 });
	}

	let locale = params.locale;
	if (!locale) {
		locale = (await i18nServer.getLocale(request)) || "en";
	}
	if (submission.status !== "success") {
		return { lastResult: submission.reply(), slug: null };
	}
	if (!geminiApiKey) {
		return {
			lastResult: submission.reply({
				formErrors: ["Gemini API key is not set"],
			}),
			slug: null,
		};
	}
	switch (submission.value.intent) {
		case TranslationIntent.TRANSLATE_COMMENT: {
			const pageWithComments = await fetchPageWithTitleAndComments(
				submission.value.pageId,
			);
			if (!pageWithComments) {
				return {
					lastResult: submission.reply({
						formErrors: ["Page not found"],
					}),
					slug: null,
				};
			}

			const userAITranslationInfo = await createUserAITranslationInfo(
				currentUser.id,
				pageWithComments.id,
				submission.value.aiModel,
				locale,
			);

			const commentsSegmentsArray = pageWithComments.pageComments.map(
				(comment) => {
					return {
						commentId: comment.id,
						segments: comment.pageCommentSegments.map((segment) => ({
							number: segment.number,
							text: segment.text,
						})),
					};
				},
			);
			for (const comment of commentsSegmentsArray) {
				const queue = getTranslateUserQueue(currentUser.id);
				await queue.add(`translate-${currentUser.id}`, {
					userAITranslationInfoId: userAITranslationInfo.id,
					geminiApiKey: geminiApiKey.apiKey,
					aiModel: submission.value.aiModel,
					userId: currentUser.id,
					pageId: pageWithComments.id,
					locale: locale,
					title: pageWithComments.pageSegments[0].text,
					numberedElements: comment.segments,
					translationIntent: TranslationIntent.TRANSLATE_COMMENT,
					commentId: comment.commentId,
				});
			}
			return {
				lastResult: submission.reply({ resetForm: true }),
				slug: null,
			};
		}
		case TranslationIntent.TRANSLATE_PAGE: {
			const pageWithPageSegments = await fetchPageWithPageSegments(
				submission.value.pageId,
			);
			if (!pageWithPageSegments) {
				return {
					lastResult: submission.reply({
						formErrors: ["Page not found"],
					}),
					slug: null,
				};
			}

			const numberedElements = pageWithPageSegments.pageSegments.map(
				(item) => ({
					number: item.number,
					text: item.text,
				}),
			);
			const userAITranslationInfo = await createUserAITranslationInfo(
				currentUser.id,
				pageWithPageSegments.id,
				submission.value.aiModel,
				locale,
			);

			const queue = getTranslateUserQueue(currentUser.id);
			await queue.add(`translate-${currentUser.id}`, {
				userAITranslationInfoId: userAITranslationInfo.id,
				geminiApiKey: geminiApiKey.apiKey,
				aiModel: submission.value.aiModel,
				userId: currentUser.id,
				pageId: pageWithPageSegments.id,
				locale: locale,
				title: pageWithPageSegments.title,
				numberedElements: numberedElements,
				translationIntent: TranslationIntent.TRANSLATE_PAGE,
			});
			return {
				lastResult: submission.reply({ resetForm: true }),
				slug: pageWithPageSegments.slug,
			};
		}
	}
}

export default function Page() {
	const {
		pageWithTranslations,
		currentUser,
		hasGeminiApiKey,
		userAITranslationInfo,
		pageSegmentTitleWithTranslations,
		sourceTitleWithBestTranslationTitle,
		locale,
		likeCount,
		isLikedByUser,
		pageCommentsWithUser,
		existLocales,
		pageCommentsCount,
	} = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		lastResult: actionData?.lastResult,
	});

	const [showOriginal, setShowOriginal] = useState(true);
	const [showTranslation, setShowTranslation] = useState(true);
	const shareUrl = typeof window !== "undefined" ? window.location.href : "";

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
					existLocales={existLocales}
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
					<div className="mt-8">
						<div className="flex items-center gap-2 py-2">
							<h2 className="text-2xl font-bold">Comments</h2>
							<TranslateActionSection
								pageId={pageWithTranslations.page.id}
								userAITranslationInfo={userAITranslationInfo}
								hasGeminiApiKey={hasGeminiApiKey}
								pageLocale={pageWithTranslations.page.sourceLanguage}
								locale={locale}
								existLocales={existLocales}
								intent="translateComment"
							/>
						</div>
						<PageCommentList
							pageCommentsWithUser={pageCommentsWithUser}
							currentUserId={currentUser?.id}
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
		</div>
	);
}
