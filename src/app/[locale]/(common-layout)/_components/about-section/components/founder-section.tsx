import { getAboutCopy } from "../copy";
import { ABOUT_SECTION_HEADING_CLASS, AboutSectionContent } from "./layout";

export default function FounderSection({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);

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
						<h2 className={ABOUT_SECTION_HEADING_CLASS}>{copy.founderTitle}</h2>
					</div>
					<div className="mt-6 space-y-5 text-base leading-relaxed md:text-lg">
						{copy.founderParagraphs.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>
				</div>
			</div>
		</AboutSectionContent>
	);
}
