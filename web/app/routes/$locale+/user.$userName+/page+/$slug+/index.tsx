import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { data } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { getTranslateUserQueue } from "~/features/translate/translate-user-queue";
import i18nServer from "~/i18n.server";
import { localeCookie } from "~/i18n.server";
import { fetchUserByUserName } from "~/routes/functions/queries.server";
import { LikeButton } from "~/routes/resources+/like-button";
import { authenticator } from "~/utils/auth.server";
import { ContentWithTranslations } from "./components/ContentWithTranslations";
import { FloatingControls } from "./components/FloatingControls";
import { createUserAITranslationInfo } from "./functions/mutations.server";
import {
	fetchIsLikedByUser,
	fetchLatestUserAITranslationInfo,
	fetchLikeCount,
	fetchPageWithSourceTexts,
	fetchPageWithTranslations,
} from "./functions/queries.server";
import { actionSchema } from "./types";
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
		: pageWithTranslations.user.icon;

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
	];
};

export async function loader({ params, request }: LoaderFunctionArgs) {
	const locale = await i18nServer.getLocale(request);
	const { slug } = params;
	if (!slug) {
		throw new Response("Missing URL parameter", { status: 400 });
	}

	const currentUser = await authenticator.isAuthenticated(request);
	const nonSanitizedUser = await fetchUserByUserName(
		currentUser?.userName ?? "",
	);
	const hasGeminiApiKey = !!nonSanitizedUser?.geminiApiKey;
	const pageWithTranslations = await fetchPageWithTranslations(
		slug,
		currentUser?.id ?? 0,
		locale,
	);

	if (!pageWithTranslations) {
		throw new Response("Failed to fetch article", { status: 500 });
	}
	const isOwner = pageWithTranslations?.user.userName === currentUser?.userName;
	if (pageWithTranslations.page.isArchived) {
		throw new Response("Page not found", { status: 404 });
	}
	if (!isOwner && !pageWithTranslations.page.isPublished) {
		throw new Response("Page not found", { status: 404 });
	}
	const sourceTitleWithTranslations =
		pageWithTranslations.sourceTextWithTranslations.filter(
			(item) => item.sourceText?.number === 0,
		)[0];
	const bestTranslationTitle = getBestTranslation(
		sourceTitleWithTranslations.translationsWithVotes,
	);
	const userAITranslationInfo = await fetchLatestUserAITranslationInfo(
		pageWithTranslations.page.id,
		nonSanitizedUser?.id ?? 0,
		locale,
	);
	const sourceTitleWithBestTranslationTitle = bestTranslationTitle
		? `${sourceTitleWithTranslations.sourceText.text} - ${bestTranslationTitle.translateText.text}`
		: sourceTitleWithTranslations.sourceText.text;
	const likeCount = await fetchLikeCount(pageWithTranslations.page.id);
	const isLikedByUser = await fetchIsLikedByUser(
		pageWithTranslations.page.id,
		currentUser?.id ?? 0,
	);
	return data(
		{
			locale,
			pageWithTranslations,
			currentUser,
			hasGeminiApiKey,
			userAITranslationInfo,
			sourceTitleWithTranslations,
			sourceTitleWithBestTranslationTitle,
			likeCount,
			isLikedByUser,
		},
		{
			headers: { "Set-Cookie": await localeCookie.serialize(locale) },
		},
	);
}

export async function action({ request }: ActionFunctionArgs) {
	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});
	const submission = parseWithZod(await request.formData(), {
		schema: actionSchema,
	});
	const nonSanitizedUser = await fetchUserByUserName(currentUser.userName);
	if (!nonSanitizedUser) {
		throw new Response("User not found", { status: 404 });
	}
	const locale = await i18nServer.getLocale(request);

	if (submission.status !== "success") {
		return { intent: null, lastResult: submission.reply(), slug: null };
	}
	if (!nonSanitizedUser?.geminiApiKey) {
		return {
			lastResult: submission.reply({
				formErrors: ["Gemini API key is not set"],
			}),
			intent: null,
			slug: null,
		};
	}
	const pageWithSourceTexts = await fetchPageWithSourceTexts(
		submission.value.pageId,
	);
	if (!pageWithSourceTexts) {
		return {
			lastResult: submission.reply({
				formErrors: ["Page not found"],
			}),
			intent: null,
			slug: null,
		};
	}
	const userAITranslationInfo = await createUserAITranslationInfo(
		nonSanitizedUser.id,
		pageWithSourceTexts.id,
		submission.value.aiModel,
		locale,
	);

	const queue = getTranslateUserQueue(nonSanitizedUser.id);
	await queue.add(`translate-${nonSanitizedUser.id}`, {
		userAITranslationInfoId: userAITranslationInfo.id,
		geminiApiKey: nonSanitizedUser.geminiApiKey,
		aiModel: submission.value.aiModel,
		userId: nonSanitizedUser.id,
		pageId: pageWithSourceTexts.id,
		locale: locale,
		title: pageWithSourceTexts.title,
		numberedContent: pageWithSourceTexts.content,
		numberedElements: pageWithSourceTexts.sourceTexts,
	});
	return {
		lastResult: submission.reply({ resetForm: true }),
		slug: pageWithSourceTexts.slug,
	};
}

export default function Page() {
	const {
		pageWithTranslations,
		currentUser,
		hasGeminiApiKey,
		userAITranslationInfo,
		sourceTitleWithTranslations,
		sourceTitleWithBestTranslationTitle,
		locale,
		likeCount,
		isLikedByUser,
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
			<article className="w-full prose dark:prose-invert prose-a:underline prose-a:decoration-dotted sm:prose lg:prose-lg mx-auto px-2 mb-20">
				<ContentWithTranslations
					pageWithTranslations={pageWithTranslations}
					sourceTitleWithTranslations={sourceTitleWithTranslations}
					currentUserName={currentUser?.userName}
					hasGeminiApiKey={hasGeminiApiKey}
					userAITranslationInfo={userAITranslationInfo}
					locale={locale}
					showOriginal={showOriginal}
					showTranslation={showTranslation}
				/>
				<LikeButton
					liked={isLikedByUser}
					likeCount={likeCount}
					slug={pageWithTranslations.page.slug}
					showCount
				/>
			</article>
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
