import { getAboutCopy } from "../copy";
import { AboutSectionContent } from "./layout";

export default function FinalCTA({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);

	return (
		<AboutSectionContent
			containerClassName="max-w-4xl text-center"
			withVerticalPadding={true}
		>
			<p className="text-2xl font-semibold leading-relaxed md:text-4xl">
				{copy.finalTitle}
			</p>
			<div className="mt-12 flex justify-center">
				<a
					className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-lg font-medium text-primary-foreground transition-opacity hover:opacity-90"
					href={`/${locale}`}
				>
					{copy.explore}
				</a>
			</div>
		</AboutSectionContent>
	);
}
