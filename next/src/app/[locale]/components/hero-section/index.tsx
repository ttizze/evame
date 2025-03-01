import { SegmentAndTranslationSection } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/components/segment-and-translation-section";
import { ADD_TRANSLATION_FORM_TARGET } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { VOTE_TARGET } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { TranslateTarget } from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import { StartButton } from "@/app/[locale]/components/start-button";
import { TranslateActionSection } from "@/app/[locale]/components/translate-action-section";
import { fetchPageWithTranslations } from "@/app/[locale]/db/queries.server";
import { fetchLatestPageAITranslationInfo } from "@/app/[locale]/db/queries.server";
import { notFound } from "next/navigation";

export default async function HeroSection({ locale }: { locale: string }) {
	const pageSlug = locale === "ja" ? "evame" : "evame-ja";
	const topPageWithTranslations = await fetchPageWithTranslations(
		pageSlug,
		locale,
		undefined,
	);
	if (!topPageWithTranslations) {
		return notFound();
	}
	const pageAITranslationInfo = await fetchLatestPageAITranslationInfo(
		topPageWithTranslations.page.id,
	);

	const [title, text] = topPageWithTranslations.segmentWithTranslations
		.filter((st) => st.segment.number === 0 || st.segment.number === 1)
		.sort((a, b) => a.segment.number - b.segment.number);

	if (!title || !text) {
		const error = new Error("Invalid hero section");
		error.message = "Invalid hero section";
		throw error;
	}
	const heroTitle = title;
	const heroText = text;
	const sourceLocale = topPageWithTranslations.page.sourceLocale;
	return (
		<div className="prose dark:prose-invert sm:prose lg:prose-lg mx-auto px-2 py-10 flex flex-col items-center justify-center">
			<div className="max-w-4xl w-full">
				<h1 className="text-7xl font-bold mb-10 text-center">
					<SegmentAndTranslationSection
						segmentWithTranslations={heroTitle}
						segmentTextClassName="w-full bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text !text-transparent mb-2"
						elements={heroTitle.segment.text}
						currentHandle={undefined}
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
						userAITranslationInfo={null}
						sourceLocale={sourceLocale}
						pageAITranslationInfo={pageAITranslationInfo}
						translateTarget={TranslateTarget.TRANSLATE_PAGE}
						showIcons={false}
					/>
				</div>
				<span className="text-xl mb-12 w-full">
					<SegmentAndTranslationSection
						segmentWithTranslations={heroText}
						segmentTextClassName="mb-2"
						elements={heroText.segment.text}
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
		</div>
	);
}
