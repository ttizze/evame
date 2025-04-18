import { fetchAboutPage } from "@/app/[locale]/(common-layout)/about/_lib/fetch-about-page";
import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import { StartButton } from "@/app/[locale]/_components/start-button";
import { TranslateActionSection } from "@/app/[locale]/_components/translate-action-section";
import { fetchLatestPageAITranslationInfo } from "@/app/[locale]/_db/page-queries.server";
import { getCurrentUser } from "@/auth";
import Image from "next/image";

export const Icon = ({ className, ...rest }: { className: string }) => {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
			strokeWidth="1.5"
			stroke="currentColor"
			className={className}
			{...rest}
		>
			<title>Back</title>
			<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
		</svg>
	);
};

export default async function HeroSection({ locale }: { locale: string }) {
	const currentUser = await getCurrentUser();
	const currentHandle = currentUser?.handle;
	const topPageDetail = await fetchAboutPage(locale);

	const pageAITranslationInfo = await fetchLatestPageAITranslationInfo(
		topPageDetail.id,
	);

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
	const sourceLocale = topPageDetail.sourceLocale;
	return (
		<div className="relative overflow-hidden border pt-10 flex flex-col items-center justify-center">
			<Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
			<Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
			<Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
			<Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />
			<div className="flex justify-center mb-10 z-10">
				<TranslateActionSection
					pageId={0}
					currentHandle={currentHandle}
					userAITranslationInfo={null}
					sourceLocale={sourceLocale}
					pageAITranslationInfo={pageAITranslationInfo}
					targetContentType="page"
					showIcons={false}
				/>
			</div>
			<div className="relative z-10 px-4 md:px-8 max-w-4xl mx-auto">
				<h1 className="text-2xl md:text-4xl font-bold mb-6 text-center">
					<SegmentAndTranslationSection
						segmentBundle={heroTitle}
						segmentTextClassName="w-full mb-2"
						currentHandle={currentHandle}
					/>
				</h1>

				<span className="text-xl mb-12 w-full">
					<SegmentAndTranslationSection
						segmentBundle={heroText}
						segmentTextClassName="mb-2"
						currentHandle={currentHandle}
					/>
				</span>
				<div className="mb-12 flex justify-center mt-10">
					<StartButton
						text="Join Now"
						icon={
							<Image
								src="/favicon.svg"
								alt="Hero section image"
								width={14}
								height={14}
								className="relative z-10 invert"
							/>
						}
						className="w-60 h-12 text-xl rounded-full transition-all duration-300 hover:scale-105"
					/>
				</div>
				<div className="relative  my-10 flex justify-center">
					<div
						className="absolute inset-0 dark:hidden"
						style={{
							background: `
      repeating-conic-gradient(from 0deg at 50% center,
        rgba(0, 0, 0, 0.05) 0deg,
        rgba(0, 0, 0, 0.05) 0.5deg,
        transparent 0.5deg,
        transparent 3deg)
    `,
							maskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 30%, black 40%, black 60%, transparent 70%, transparent 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 30%, black 40%, black 60%, transparent 70%, transparent 100%)",
						}}
					/>
					<div
						className="absolute inset-0 hidden dark:block"
						style={{
							background: `
      repeating-conic-gradient(from 0deg at 50% center,
        rgba(255, 255, 255, 0.05) 0deg,
        rgba(255, 255, 255, 0.05) 0.5deg,
        transparent 0.5deg,
        transparent 3deg)
    `,
							maskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 30%, black 40%, black 60%, transparent 70%, transparent 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 30%, black 40%, black 60%, transparent 70%, transparent 100%)",
						}}
					/>
					{/* 色線（右側だけにマスク） */}
					<div
						className="absolute inset-0"
						style={{
							background: `
repeating-conic-gradient(from -45deg at 50% center,
          rgba(255, 0, 0, 0.3) 0deg,
          rgba(255, 0, 0, 0.3) 1deg,
          transparent 1deg,
          transparent 20deg),
        repeating-conic-gradient(from 0deg at 50% center,
          rgba(0, 255, 0, 0.3) 0deg,
          rgba(0, 255, 0, 0.3) 1deg,
          transparent 1deg,
          transparent 20deg),
        repeating-conic-gradient(from 45deg at 50% center,
          rgba(0, 100, 255, 0.3) 0deg,
          rgba(0, 100, 255, 0.3) 1deg,
          transparent 1deg,
          transparent 20deg)
      `,
							WebkitMaskImage:
								"linear-gradient(to right, transparent 52%, black 52%)",
							maskImage:
								"linear-gradient(to right, transparent 52%, black 52%)",
						}}
					/>

					<Image
						src="/favicon.svg"
						alt="Hero section image"
						width={100}
						height={100}
						className="relative z-10"
					/>
				</div>
			</div>
		</div>
	);
}
