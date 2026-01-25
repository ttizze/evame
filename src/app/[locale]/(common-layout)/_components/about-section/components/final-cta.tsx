import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { StartButton } from "../../start-button";
import { fetchAboutPage } from "../service/fetch-about-page";

export default async function FinalCTA({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const headerSegment = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.finalCTAHeader,
	);
	const textSegment = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.finalCTAText,
	);

	if (!headerSegment || !textSegment) {
		return null;
	}

	return (
		<section className="py-16 md:py-24">
			<div className="max-w-3xl mx-auto px-6 text-center">
				<p className="text-2xl md:text-4xl font-medium leading-relaxed">
					<SegmentElement segment={headerSegment} tagName="span" />
				</p>
				<p className="text-2xl md:text-4xl font-medium leading-relaxed mt-2">
					<SegmentElement segment={textSegment} tagName="span" />
				</p>
				<div className="mt-12">
					<StartButton className="w-60 h-14 text-lg" text="Start Writing" />
				</div>
			</div>
		</section>
	);
}
