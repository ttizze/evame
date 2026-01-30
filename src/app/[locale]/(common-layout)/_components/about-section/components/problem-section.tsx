import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../service/fetch-about-page";

export default async function ProblemSection({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const headerSegment = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.problemHeader,
	);
	const textSegments = [
		SEGMENT_NUMBER.problemText1,
		SEGMENT_NUMBER.problemText2,
		SEGMENT_NUMBER.problemText3,
	]
		.map((number) => pageDetail.segments.find((s) => s.number === number))
		.filter((segment) => segment != null);

	if (!headerSegment || textSegments.length !== 3) {
		return null;
	}

	return (
		<section className="py-16 md:py-24">
			<div className="mx-auto max-w-5xl px-6">
				<div className="relative overflow-hidden rounded-3xl border border-border/60 bg-muted/40 p-8 md:p-12 shadow-sm">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -left-28 -bottom-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_70%)] opacity-70 blur-3xl"
					/>
					<div className="relative">
						<h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
							<SegmentElement segment={headerSegment} tagName="span" />
						</h2>
						<div className="mt-6 space-y-4 text-base md:text-lg leading-relaxed">
							{textSegments.map((segment) => (
								<SegmentElement
									key={segment.number}
									segment={segment}
									tagName="p"
								/>
							))}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
