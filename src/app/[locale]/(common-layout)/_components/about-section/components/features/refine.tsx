import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../../service/fetch-about-page";

const VOTE_HINT: Record<string, string> = {
	ja: "訳文をクリックで投票を試す ↓",
	en: "Click translation to try voting ↓",
	zh: "点击译文尝试投票 ↓",
	ko: "번역문을 클릭하여 투표해보기 ↓",
	es: "Haz clic en la traducción para votar ↓",
};

export default async function RefineFeature({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const header = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.refineHeader,
	);
	const text = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.refineText,
	);

	if (!header || !text) return null;

	return (
		<article className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
			<div className="flex-1">
				<h3 className="text-2xl md:text-3xl font-semibold">
					<SegmentElement segment={header} tagName="span" />
				</h3>
				<p className="mt-4 text-base md:text-lg leading-relaxed text-muted-foreground">
					<SegmentElement segment={text} tagName="span" />
				</p>
			</div>
			<div className="flex-1 w-full">
				<p className="mb-2 text-xs text-muted-foreground text-center">
					{VOTE_HINT[locale] ?? VOTE_HINT.en}
				</p>
				<div className="rounded-2xl bg-muted/30 p-6 md:p-8">
					<div className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
						<SegmentElement segment={text} tagName="span" />
					</div>
				</div>
			</div>
		</article>
	);
}
