import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../service/fetch-about-page";

const FAQ_ITEMS = [
	{
		question: SEGMENT_NUMBER.faq1Question,
		answer: SEGMENT_NUMBER.faq1Answer,
	},
	{
		question: SEGMENT_NUMBER.faq2Question,
		answer: SEGMENT_NUMBER.faq2Answer,
	},
	{
		question: SEGMENT_NUMBER.faq3Question,
		answer: SEGMENT_NUMBER.faq3Answer,
	},
	{
		question: SEGMENT_NUMBER.faq4Question,
		answer: SEGMENT_NUMBER.faq4Answer,
	},
];

export default async function FAQSection({ locale }: { locale: string }) {
	const pageDetail = await fetchAboutPage(locale);
	const headerSegment = pageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.faqHeader,
	);
	const items = FAQ_ITEMS.map((item) => {
		const question = pageDetail.segments.find(
			(s) => s.number === item.question,
		);
		const answer = pageDetail.segments.find((s) => s.number === item.answer);
		if (!question || !answer) return null;
		return { question, answer };
	}).filter((item) => item != null);

	if (!headerSegment || items.length !== 4) {
		return null;
	}

	return (
		<section className="py-16 md:py-24">
			<div className="mx-auto max-w-5xl px-6">
				<div className="rounded-3xl border border-border/60 bg-card/80 p-8 md:p-12 shadow-sm">
					<h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
						<SegmentElement segment={headerSegment} tagName="span" />
					</h2>
					<dl className="mt-8 space-y-5">
						{items.map((item) => (
							<div
								className="rounded-2xl border border-border/60 bg-background/80 p-6 md:p-7 shadow-sm"
								key={item.question.number}
							>
								<dt className="text-lg md:text-xl font-medium leading-snug">
									<SegmentElement segment={item.question} tagName="span" />
								</dt>
								<dd className="mt-4 text-base md:text-lg leading-relaxed">
									<SegmentElement segment={item.answer} tagName="span" />
								</dd>
							</div>
						))}
					</dl>
				</div>
			</div>
		</section>
	);
}
