import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../service/fetch-about-page";

export default async function FounderSection({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const headerSegment = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.founderStoryHeader,
	);
	const paragraphSegments = pageDetail.segments
		.filter(
			(s) =>
				s.number >= SEGMENT_NUMBER.founderStoryText1 &&
				s.number <= SEGMENT_NUMBER.founderStoryText4,
		)
		.sort((a, b) => a.number - b.number);

	if (!headerSegment || paragraphSegments.length === 0) {
		return null;
	}

	return (
		<section className="py-16 md:py-24">
			<div className="mx-auto max-w-5xl px-6">
				<div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-8 md:p-12 shadow-sm">
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.2),transparent_70%)] opacity-70 blur-3xl"
					/>
					<div className="relative">
						<div className="flex items-center gap-3">
							<span
								aria-hidden="true"
								className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-400 via-emerald-400 to-amber-400"
							/>
							<h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
								<SegmentElement segment={headerSegment} tagName="span" />
							</h2>
						</div>

						<div className="mt-6 space-y-5 text-base md:text-lg leading-relaxed">
							{paragraphSegments.map((segment) => (
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
