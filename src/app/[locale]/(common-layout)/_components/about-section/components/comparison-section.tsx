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
			<div className="mt-8 overflow-x-auto">
				<div className=" overflow-hidden rounded-2xl border border-border/60 bg-background/80">
					<table className="w-full border-collapse text-left">
						<thead className="bg-muted/30">
							<tr>
								<th className="py-4 pl-4 pr-4 text-xs font-semibold" />
								<th className="py-4 px-4 text-xs font-semibold border-l border-border/60">
									<SegmentElement segment={col1Segment} tagName="span" />
								</th>
								<th className="py-4 pl-4 text-xs font-semibold border-l border-border/60">
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
										className="py-4 pl-4 pr-4 text-sm font-medium align-top"
										scope="row"
									>
										<SegmentElement segment={row.label} tagName="span" />
									</th>
									<td className="py-4 px-4 text-sm align-top border-l border-border/60">
										<SegmentElement segment={row.evame} tagName="span" />
									</td>
									<td className="py-4 pl-4 text-sm align-top border-l border-border/60">
										<SegmentElement segment={row.others} tagName="span" />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</AboutSectionContent>
	);
}
