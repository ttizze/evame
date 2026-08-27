import { getAboutCopy } from "../copy";
import { ABOUT_SECTION_HEADING_CLASS, AboutSectionContent } from "./layout";

export default function FAQSection({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);

	return (
		<AboutSectionContent withVerticalPadding={true}>
			<h2 className={ABOUT_SECTION_HEADING_CLASS}>{copy.faqTitle}</h2>
			<dl className="mt-8 space-y-5">
				{copy.faq.map(([question, answer]) => (
					<div
						className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm md:p-7"
						key={question}
					>
						<dt className="text-lg font-medium leading-snug md:text-xl">
							{question}
						</dt>
						<dd className="mt-4 text-base leading-relaxed md:text-lg">
							{answer}
						</dd>
					</div>
				))}
			</dl>
		</AboutSectionContent>
	);
}
