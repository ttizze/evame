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
				s.number >= SEGMENT_NUMBER.founderStoryText &&
				s.number <= SEGMENT_NUMBER.founderStoryText3,
		)
		.sort((a, b) => a.number - b.number);

	if (!headerSegment || paragraphSegments.length === 0) {
		return null;
	}

	return (
		<section className="py-16">
			<div className="mx-auto px-6">
				<h2 className="text-3xl md:text-4xl font-medium">
					<SegmentElement segment={headerSegment} tagName="span" />
				</h2>

				<div className="text-lg leading-relaxed space-y-4">
					{paragraphSegments.map((segment) => (
						<SegmentElement
							key={segment.number}
							segment={segment}
							tagName="p"
						/>
					))}
				</div>
			</div>
		</section>
	);
}
