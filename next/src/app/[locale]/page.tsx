import { TabsClient } from "@/app/[locale]/components/TabsClient";
import { StartButton } from "@/app/[locale]/components/start-button";
import { fetchPaginatedPublicPagesWithInfo } from "@/app/[locale]/db/queries.server";
import type { PageCardLocalizedType } from "@/app/[locale]/db/queries.server";
import { fetchPageWithTranslations } from "@/app/[locale]/db/queries.server";
import { SegmentAndTranslationSection } from "@/app/[locale]/user/[handle]/page/[slug]/components/segment-and-translation-section";
import { TranslateActionSection } from "@/app/[locale]/user/[handle]/page/[slug]/components/translate-button/translate-action-section";
import { ADD_TRANSLATION_FORM_TARGET } from "@/app/[locale]/user/[handle]/page/[slug]/constants";
import { VOTE_TARGET } from "@/app/[locale]/user/[handle]/page/[slug]/constants";
import { TranslateTarget } from "@/app/[locale]/user/[handle]/page/[slug]/constants";
import { getCurrentUser } from "@/auth";
import { getGuestId } from "@/lib/get-guest-id";
import type { Metadata } from "next";
export const metadata: Metadata = {
	title: "Evame - Home - Latest Pages",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};

export default async function HomePage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const currentUser = await getCurrentUser();
	const { locale } = await params;
	const {
		tab = "recommended",
		newPage = "1",
		recommendedPage = "1",
	} = await searchParams;
	if (
		typeof tab !== "string" ||
		typeof newPage !== "string" ||
		typeof recommendedPage !== "string"
	) {
		throw new Error("Invalid tab, newPage, or recommendedPage");
	}

	let heroTitle = null;
	let heroText = null;
	let existLocales: string[] = [];
	let sourceLocale = "en";
	if (!currentUser) {
		//localeがjaならevameを取得｡日本人に原文英語､訳文日本語のページを表示するため｡
		const pageName = locale === "ja" ? "evame" : "evame-ja";
		const topPageWithTranslations = await fetchPageWithTranslations(
			pageName,
			locale,
			undefined,
		);
		if (!topPageWithTranslations) {
			throw new Response("Not Found", { status: 404 });
		}

		const [title, text] = topPageWithTranslations.segmentWithTranslations
			.filter((st) => st.segment.number === 0 || st.segment.number === 1)
			.sort((a, b) => a.segment.number - b.segment.number);

		if (!title || !text) {
			throw new Response("Not Found", { status: 404 });
		}
		heroTitle = title;
		heroText = text;
		existLocales = topPageWithTranslations.existLocales;
		sourceLocale = topPageWithTranslations.page.sourceLocale;
	}

	// ゲストID確保
	const guestId = await getGuestId();

	// ページング情報取得
	let pagesWithInfo: PageCardLocalizedType[];
	let totalPages: number;
	let currentPage: number;

	if (tab === "recommended") {
		const result = await fetchPaginatedPublicPagesWithInfo({
			page: Number(recommendedPage),
			pageSize: 9,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			isRecommended: true,
			locale,
		});
		pagesWithInfo = result.pagesWithInfo;
		totalPages = result.totalPages;
		currentPage = result.currentPage;
	} else {
		const result = await fetchPaginatedPublicPagesWithInfo({
			page: Number(newPage),
			pageSize: 9,
			currentUserId: currentUser?.id,
			currentGuestId: guestId,
			locale,
		});
		pagesWithInfo = result.pagesWithInfo;
		totalPages = result.totalPages;
		currentPage = result.currentPage;
	}

	return (
		<div className="flex flex-col justify-between">
			{/* 未ログインの場合のみ hero を表示 */}
			{!currentUser && heroTitle && heroText && (
				<main className="prose dark:prose-invert sm:prose lg:prose-lg mx-auto px-2 py-10 flex flex-col items-center justify-center">
					<div className="max-w-4xl w-full">
						<h1 className="text-7xl font-bold mb-10 text-center">
							<SegmentAndTranslationSection
								segmentWithTranslations={heroTitle}
								sourceTextClassName="w-full bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text !text-transparent mb-2"
								elements={heroTitle.segment.text}
								currentHandle={undefined}
								showOriginal={true}
								showTranslation={true}
								voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
								addTranslationFormTarget={
									ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
								}
							/>
						</h1>
						<div className="flex justify-center mb-10">
							<TranslateActionSection
								pageId={0}
								currentHandle={undefined}
								hasGeminiApiKey={false}
								userAITranslationInfo={null}
								sourceLocale={sourceLocale}
								locale={locale}
								existLocales={existLocales}
								translateTarget={TranslateTarget.TRANSLATE_PAGE}
							/>
						</div>
						<span className="text-xl mb-12 w-full">
							<SegmentAndTranslationSection
								segmentWithTranslations={heroText}
								sourceTextClassName="mb-2"
								elements={heroText.segment.text}
								showOriginal={true}
								showTranslation={true}
								currentHandle={undefined}
								voteTarget={VOTE_TARGET.PAGE_SEGMENT_TRANSLATION}
								addTranslationFormTarget={
									ADD_TRANSLATION_FORM_TARGET.PAGE_SEGMENT_TRANSLATION
								}
							/>
						</span>

						<div className="mb-12 flex justify-center mt-10">
							<StartButton className="w-60 h-12 text-xl" />
						</div>
					</div>
				</main>
			)}

			{/* ページ一覧 */}
			<TabsClient
				initialTab={tab}
				pagesWithInfo={pagesWithInfo}
				totalPages={totalPages}
				currentPage={currentPage}
				locale={locale}
			/>
		</div>
	);
}
