import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../service/fetch-about-page";
import { ABOUT_SECTION_HEADING_CLASS, AboutSectionContent } from "./layout";

export default async function ProblemSection({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const headerSegment = pageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.problemHeader,
	);
	const textSegments = [
		SEGMENT_NUMBER.problemText1,
		SEGMENT_NUMBER.problemText2,
		SEGMENT_NUMBER.problemText3,
	]
		.map((number) =>
			pageDetail.segments.find((segment) => segment.number === number),
		)
		.filter((segment) => segment != null);

	if (!headerSegment || textSegments.length !== 3) {
		return null;
	}

	return (
		<AboutSectionContent>
			<div className="relative">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -left-28 -bottom-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_70%)] opacity-70 blur-3xl"
				/>
				<div className="relative">
					<h2 className={ABOUT_SECTION_HEADING_CLASS}>
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
		</AboutSectionContent>
	);
}
