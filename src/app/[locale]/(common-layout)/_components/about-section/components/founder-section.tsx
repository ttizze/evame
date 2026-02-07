import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../service/fetch-about-page";
import { ABOUT_SECTION_HEADING_CLASS, AboutSectionContent } from "./layout";

export default async function FounderSection({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const headerSegment = pageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.founderStoryHeader,
	);
	const paragraphSegments = pageDetail.segments
		.filter(
			(segment) =>
				segment.number >= SEGMENT_NUMBER.founderStoryText1 &&
				segment.number <= SEGMENT_NUMBER.founderStoryText4,
		)
		.sort((a, b) => a.number - b.number);

	if (!headerSegment || paragraphSegments.length === 0) {
		return null;
	}

	return (
		<AboutSectionContent>
			<div className="relative overflow-x-clip">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute right-0 top-0 h-56 w-56 translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.2),transparent_70%)] opacity-70 blur-2xl md:blur-3xl"
				/>
				<div className="relative">
					<div className="flex items-center gap-3">
						<span
							aria-hidden="true"
							className="h-10 w-1 rounded-full bg-gradient-to-b from-sky-400 via-emerald-400 to-amber-400"
						/>
						<h2 className={ABOUT_SECTION_HEADING_CLASS}>
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
		</AboutSectionContent>
	);
}
