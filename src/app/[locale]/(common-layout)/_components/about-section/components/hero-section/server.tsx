import { getAboutCopy } from "../../copy";
import { HeroRays } from "./hero-rays";

export default function HeroSection({ locale }: { locale: string }) {
	const copy = getAboutCopy(locale);

	return (
		<section className="relative overflow-hidden py-16 md:py-24">
			<div className="relative z-10 mx-auto w-full max-w-5xl px-6">
				<div className="text-center">
					<p className="text-sm font-medium tracking-wide text-muted-foreground">
						{copy.brand}
					</p>
					<h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
						{copy.heroTitle}
					</h2>
					<div className="mx-auto mt-6 h-px w-24 bg-linear-to-r from-transparent via-foreground/40 to-transparent" />
					<p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground md:text-xl">
						{copy.heroDetail}
					</p>
				</div>
				<div className="mt-10 flex justify-center">
					<a
						className="inline-flex h-14 items-center justify-center rounded-full bg-primary px-8 text-lg font-medium text-primary-foreground shadow-[0_18px_45px_rgba(15,23,42,0.18)] transition-opacity hover:opacity-90"
						href={`/${locale}`}
					>
						{copy.explore}
					</a>
				</div>
				<div className="mt-10">
					<HeroRays />
				</div>
			</div>
		</section>
	);
}
