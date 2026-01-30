import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { StartButton } from "../../start-button";
import { fetchAboutPage } from "../service/fetch-about-page";

export default async function FinalCTA({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const headerSegment = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.finalCTAHeader,
	);

	if (!headerSegment) {
		return null;
	}

	return (
		<section className="py-16 md:py-24">
			<div className="mx-auto max-w-4xl px-6 text-center">
				<p className="text-2xl md:text-4xl font-semibold leading-relaxed">
					<SegmentElement segment={headerSegment} tagName="span" />
				</p>
				<div className="mt-12 flex justify-center">
					<StartButton className="w-64 h-14 text-lg" text="Start Writing" />
				</div>
			</div>
		</section>
	);
}
