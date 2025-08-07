import Image from "next/image";
import { StartButton } from "@/app/[locale]/_components/start-button";
import { WrapSegmentsComponent } from "@/app/[locale]/_components/wrap-segments-component/server";
import { fetchAboutPage } from "@/app/[locale]/(common-layout)/about/_lib/fetch-about-page";

export const Icon = ({ className, ...rest }: { className: string }) => {
	return (
		<svg
			className={className}
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...rest}
		>
			<title>Back</title>
			<path d="M12 6v12m6-6H6" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
};

export default async function HeroSection({ locale }: { locale: string }) {
	const topPageDetail = await fetchAboutPage(locale);
	const [title, text] = topPageDetail.segmentBundles
		.filter((sb) => sb.segment.number === 0 || sb.segment.number === 1)
		.sort((a, b) => a.segment.number - b.segment.number);

	if (!title || !text) {
		const error = new Error("Invalid hero section");
		error.message = "Invalid hero section";
		throw error;
	}
	const heroTitle = title;
	const heroText = text;
	return (
		<div className="relative overflow-hidden border pt-10 flex flex-col items-center justify-center">
			<Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
			<Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
			<Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
			<Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
			<div className="relative z-10 px-4 md:px-8 max-w-4xl mx-auto">
				<h1 className="text-2xl md:text-4xl font-bold mb-6 text-center">
					<WrapSegmentsComponent bundle={heroTitle} className="w-full mb-2" />
				</h1>

				<span className="text-xl mb-12 w-full">
					<WrapSegmentsComponent bundle={heroText} className="mb-2" />
				</span>
				<div className="mb-12 flex justify-center mt-10">
					<StartButton
						className="w-60 h-16 text-xl transition-all duration-300 hover:scale-105"
						icon={
							<Image
								alt="Hero section image"
								className="relative z-10 invert dark:invert-0"
								height={14}
								src="/favicon.svg"
								width={14}
							/>
						}
						text="Start Now"
					/>
				</div>
				<div className="relative  my-10 flex justify-center">
					{/* 左 : 入力線  ----------------------------------- */}
					<div className="absolute inset-0 input-rays" />

					{/* 右 : 出力線（多色） ----------------------------- */}
					<div className="absolute inset-0 output-rays" />
					<Image
						alt="Hero section image"
						className="relative z-10 dark:invert"
						height={100}
						src="/favicon.svg"
						width={100}
					/>
				</div>
			</div>
		</div>
	);
}
