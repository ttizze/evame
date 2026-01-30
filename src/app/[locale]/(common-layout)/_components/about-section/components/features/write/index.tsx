import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../../../service/fetch-about-page";
import { WriteCardUI } from "./card-ui";

export default async function WriteFeature({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const header = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.writeHeader,
	);
	const text = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.writeText,
	);

	if (!header || !text) return null;

	return (
		<article className="relative flex flex-col md:flex-row gap-8 md:gap-12 items-center overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-8 md:p-12 shadow-sm">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.16),transparent_70%)] opacity-70 blur-3xl"
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
				<div className="rounded-2xl border border-border/60 bg-muted/40 p-6 md:p-8 shadow-inner">
					<WriteCardUI />
				</div>
			</div>
		</article>
	);
}
