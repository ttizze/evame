import Image from "next/image";

export const HeroRays = () => {
	return (
		<div className="relative my-10 flex h-[360px] w-full max-w-4xl items-center justify-center overflow-hidden rounded-3xl">
			<div
				aria-hidden="true"
				className="absolute inset-0 h-full w-full bg-[url('/hero-rays-light.svg')] bg-cover bg-center dark:bg-[url('/hero-rays-dark.svg')]"
			/>
			<Image
				alt="Hero section image"
				className="relative z-10 dark:invert"
				height={120}
				src="/favicon.svg"
				style={{
					filter:
						"drop-shadow(0 0 24px rgba(175, 220, 255, 0.7)) drop-shadow(0 0 52px rgba(255, 200, 230, 0.35))",
				}}
				width={120}
			/>
		</div>
	);
};
