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
		<article className="relative flex flex-col md:flex-row gap-8 md:gap-12 items-center overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-8 md:p-12 shadow-sm">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-20 -bottom-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.18),transparent_70%)] opacity-70 blur-3xl"
			/>
			<div className="relative flex-1 min-w-0">
				<h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
					<SegmentElement segment={header} tagName="span" />
				</h3>
				<p className="mt-4 text-base md:text-lg leading-relaxed">
					<SegmentElement segment={text} tagName="span" />
				</p>
			</div>
			<div className="relative flex-1 w-full">
				<p className="mb-2 text-xs text-muted-foreground text-center">
					{VOTE_HINT[locale] ?? VOTE_HINT.en}
				</p>
				<div className="rounded-2xl border border-border/60 bg-muted/40 p-6 md:p-8 shadow-inner">
					<div className="rounded-lg border border-border/60 bg-background/70 p-3 transition-colors hover:bg-background">
						<SegmentElement segment={text} tagName="span" />
					</div>
				</div>
			</div>
		</article>
	);
}
