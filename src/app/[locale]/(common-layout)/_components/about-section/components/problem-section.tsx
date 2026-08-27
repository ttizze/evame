import { getAboutCopy } from "../copy";
import { ABOUT_SECTION_HEADING_CLASS, AboutSectionContent } from "./layout";

export default function ProblemSection({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);

	return (
		<AboutSectionContent>
			<div className="relative overflow-x-clip">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 -translate-x-1/3 translate-y-1/3 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_70%)] opacity-70 blur-2xl md:blur-3xl"
				/>
				<div className="relative">
					<h2 className={ABOUT_SECTION_HEADING_CLASS}>{copy.problemTitle}</h2>
					<div className="mt-6 space-y-4 text-base leading-relaxed md:text-lg">
						{copy.problemParagraphs.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
				</div>
			</div>
		</AboutSectionContent>
	);
}
