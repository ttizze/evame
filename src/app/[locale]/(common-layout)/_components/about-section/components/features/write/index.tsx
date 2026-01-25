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
		<article className="flex flex-col md:flex-row gap-8 md:gap-12 items-center">
			<div className="flex-1">
				<h3 className="text-2xl md:text-3xl font-semibold">
					<SegmentElement segment={header} tagName="span" />
				</h3>
				<p className="mt-4 text-base md:text-lg leading-relaxed text-muted-foreground">
					<SegmentElement segment={text} tagName="span" />
				</p>
			</div>
			<div className="flex-1 w-full">
				<div className="rounded-2xl bg-muted/30 p-6 md:p-8">
					<WriteCardUI />
				</div>
			</div>
		</article>
	);
}
