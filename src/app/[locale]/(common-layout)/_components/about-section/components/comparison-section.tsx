import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../service/fetch-about-page";
import { ABOUT_SECTION_HEADING_CLASS, AboutSectionContent } from "./layout";

const COMPARISON_ROWS = [
	{
		label: SEGMENT_NUMBER.comparisonRow1Label,
		evame: SEGMENT_NUMBER.comparisonRow1Evame,
		others: SEGMENT_NUMBER.comparisonRow1Others,
	},
	{
		label: SEGMENT_NUMBER.comparisonRow2Label,
		evame: SEGMENT_NUMBER.comparisonRow2Evame,
		others: SEGMENT_NUMBER.comparisonRow2Others,
	},
	{
		label: SEGMENT_NUMBER.comparisonRow3Label,
		evame: SEGMENT_NUMBER.comparisonRow3Evame,
		others: SEGMENT_NUMBER.comparisonRow3Others,
	},
];

export default async function ComparisonSection({
	locale,
}: {
	locale: string;
}) {
	const pageDetail = await fetchAboutPage(locale);
	const headerSegment = pageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.comparisonHeader,
	);
	const col1Segment = pageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.comparisonCol1,
	);
	const col2Segment = pageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.comparisonCol2,
	);

	const rows = COMPARISON_ROWS.map((row) => {
		const label = pageDetail.segments.find(
			(segment) => segment.number === row.label,
		);
		const evame = pageDetail.segments.find(
			(segment) => segment.number === row.evame,
		);
		const others = pageDetail.segments.find(
			(segment) => segment.number === row.others,
		);
		if (!label || !evame || !others) return null;
		return { label, evame, others };
	}).filter((row) => row != null);

	if (!headerSegment || !col1Segment || !col2Segment || rows.length !== 3) {
		return null;
	}

	return (
		<AboutSectionContent withVerticalPadding={true}>
			<h2 className={ABOUT_SECTION_HEADING_CLASS}>
				<SegmentElement segment={headerSegment} tagName="span" />
			</h2>
			<div className="relative mt-8">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 left-0 z-20 w-6 bg-gradient-to-r from-background to-transparent md:hidden"
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 right-0 z-20 w-6 bg-gradient-to-l from-background to-transparent md:hidden"
				/>
				<div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2 md:mx-0 md:px-0">
					<div className="min-w-[44rem] overflow-hidden rounded-2xl border border-border/60 bg-background/80">
						<table className="min-w-[44rem] w-full border-collapse text-left">
							<thead className="bg-muted/30">
								<tr>
									<th className="sticky left-0 z-20 w-48 min-w-48 bg-muted/30 py-4 pl-4 pr-4 text-xs font-semibold backdrop-blur-sm" />
									<th className="w-56 min-w-56 border-l border-border/60 px-4 py-4 text-xs font-semibold">
										<SegmentElement segment={col1Segment} tagName="span" />
									</th>
									<th className="w-56 min-w-56 border-l border-border/60 px-4 py-4 text-xs font-semibold">
										<SegmentElement segment={col2Segment} tagName="span" />
									</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row, index) => (
									<tr
										className={[
											index === 0 ? "" : "border-t border-border/60",
											index % 2 === 1 ? "bg-muted/10" : "",
										]
											.filter(Boolean)
											.join(" ")}
										key={row.label.number}
									>
										<th
											className={[
												"sticky left-0 z-10 w-48 min-w-48 py-4 pl-4 pr-4 text-sm font-medium align-top backdrop-blur-sm",
												index % 2 === 1 ? "bg-muted/10" : "bg-background/95",
											]
												.filter(Boolean)
												.join(" ")}
											scope="row"
										>
											<SegmentElement segment={row.label} tagName="span" />
										</th>
										<td className="w-56 min-w-56 border-l border-border/60 px-4 py-4 text-sm align-top">
											<SegmentElement segment={row.evame} tagName="span" />
										</td>
										<td className="w-56 min-w-56 border-l border-border/60 px-4 py-4 text-sm align-top">
											<SegmentElement segment={row.others} tagName="span" />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</AboutSectionContent>
	);
}
