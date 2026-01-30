import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { FloatingControls } from "../../../floating-controls/floating-controls.client";
import { fetchAboutPage } from "../../service/fetch-about-page";

const READ_HINT: Record<string, string> = {
	ja: "表示を切り替えてみる ↓",
	en: "Try switching the view ↓",
	zh: "试试切换显示 ↓",
	ko: "표시를 전환해보기 ↓",
	es: "Prueba cambiar la vista ↓",
};

export default async function ReadFeature({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const header = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.readHeader,
	);
	const text = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.readText,
	);

	if (!header || !text) return null;

	return (
		<article className="relative flex flex-col md:flex-row-reverse gap-8 md:gap-12 items-center overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-8 md:p-12 shadow-sm">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -left-24 -bottom-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_70%)] opacity-70 blur-3xl"
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
					{READ_HINT[locale] ?? READ_HINT.en}
				</p>
				<div className="rounded-2xl border border-border/60 bg-muted/40 p-6 md:p-8 shadow-inner">
					<FloatingControls
						alwaysVisible={true}
						position="w-full flex justify-center"
						sourceLocale={pageDetail.sourceLocale}
						userLocale={locale}
					/>
				</div>
			</div>
		</article>
	);
}
