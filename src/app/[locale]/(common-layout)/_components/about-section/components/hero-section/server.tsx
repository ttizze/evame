import Image from "next/image";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../../service/fetch-about-page";
import { HeroRays } from "./hero-rays";

export default async function HeroSection({ locale }: { locale: string }) {
	const topPageDetail = await fetchAboutPage(locale);
	const title = topPageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.heroHeader,
	);
	const text = topPageDetail.segments.find(
		(segment) => segment.number === SEGMENT_NUMBER.heroDetail,
	);

	if (!title || !text) {
		throw new Error("Invalid hero section");
	}

	return (
		<section className="relative overflow-hidden py-16 md:py-24">
			<div className="relative z-10 mx-auto w-full max-w-5xl px-6">
				<div className="text-center">
					<h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
						<SegmentElement className="w-full" segment={title} tagName="span" />
					</h1>
					<div className="mx-auto mt-6 h-px w-24 bg-linear-to-r from-transparent via-foreground/40 to-transparent" />
					<div className="mt-6">
						<SegmentElement
							className="mx-auto max-w-3xl text-base md:text-xl leading-relaxed"
							segment={text}
							tagName="p"
						/>
					</div>
				</div>
				<div className="mt-10 flex justify-center">
					<StartButton
						className="w-64 h-16 text-lg shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
						icon={
							<Image
								alt="Hero section image"
								className="invert dark:invert-0"
								height={14}
								src="/favicon.svg"
								width={14}
							/>
						}
						text="Start Writing"
					/>
				</div>
				<div className="mt-10">
					<HeroRays />
				</div>
			</div>
		</section>
	);
}
