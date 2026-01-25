import Image from "next/image";
import { StartButton } from "@/app/[locale]/(common-layout)/_components/start-button";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import { SEGMENT_NUMBER } from "@/db/seed-data/content";
import { fetchAboutPage } from "../../service/fetch-about-page";
import { HeroRays } from "./hero-rays";

export default async function HeroSection({ locale }: { locale: string }) {
	const topPageDetail = await fetchAboutPage(locale);
	const title = topPageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.heroHeader,
	);
	const text = topPageDetail.segments.find(
		(s) => s.number === SEGMENT_NUMBER.heroText,
	);

	if (!title || !text) {
		throw new Error("Invalid hero section");
	}

	return (
		<div className="relative overflow-hidden pt-10 flex flex-col items-center justify-center">
			<div className="relative z-10 w-full">
				<h1 className="text-2xl md:text-4xl font-bold mb-6 text-center">
					<SegmentElement
						className="w-full mb-2"
						segment={title}
						tagName="span"
					/>
				</h1>

				<span className="text-xl mb-12 w-full text-center">
					<SegmentElement className="mb-2" segment={text} tagName="span" />
				</span>
				<div className="mb-12 flex justify-center mt-10">
					<StartButton
						className="w-60 h-16 text-xl"
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
				<HeroRays />
			</div>
		</div>
	);
}
