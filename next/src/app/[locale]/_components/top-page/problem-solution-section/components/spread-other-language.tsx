"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function SpreadOtherLanguage() {
	const [animate, setAnimate] = useState(false);
	useEffect(() => {
		// Initial animation
		const startTimer = setTimeout(() => setAnimate(true), 100);

		// Animation cycle: show for 2 seconds, hide for 1 second (total cycle: 3 seconds)
		const interval = setInterval(() => {
			setAnimate(false);

			setTimeout(() => setAnimate(true), 1000);
		}, 5000);

		return () => {
			clearTimeout(startTimer);
			clearInterval(interval);
		};
	}, []);

	const languages = [
		{ code: "jp", flag: "🇯🇵", name: "Japanese" },
		{ code: "us", flag: "🇺🇸", name: "English" },
		{ code: "kr", flag: "🇰🇷", name: "Korean" },
		{ code: "fr", flag: "🇫🇷", name: "French" },
		{ code: "es", flag: "🇪🇸", name: "Spanish" },
		{ code: "de", flag: "🇩🇪", name: "German" },
		{ code: "cn", flag: "🇨🇳", name: "Chinese" },
		{ code: "it", flag: "🇮🇹", name: "Italian" },
	];
	return (
		<div className="relative w-full h-[500px] flex items-center justify-center rounded-xl p-6">
			<div className="absolute inset-0 flex items-center justify-center">
				{languages.map((lang, index) => {
					// Calculate position in a circle
					const angle = index * (360 / languages.length) * (Math.PI / 180);
					const radius = 180; // Distance from center

					// Calculate x and y coordinates
					const x = Math.cos(angle) * radius;
					const y = Math.sin(angle) * radius;

					return (
						<motion.div
							key={lang.code}
							className="absolute flex flex-col items-center"
							initial={{ x, y, scale: 0, opacity: 0 }}
							animate={
								animate
									? {
											x,
											y,
											scale: 1,
											opacity: 1,
										}
									: { scale: 0, opacity: 0 }
							}
							transition={{
								duration: 0.8,
								delay: index * 0.1,
								type: "spring",
								stiffness: 100,
							}}
						>
							<motion.div
								className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border "
								whileHover={{ scale: 1.1 }}
							>
								<span className="text-2xl" role="img" aria-label={lang.name}>
									{lang.flag}
								</span>
							</motion.div>
							<Badge variant="secondary" className="mt-2">
								{lang.name}
							</Badge>
						</motion.div>
					);
				})}
			</div>

			{/* Center post card */}
			<Card className="relative z-20 w-64 shadow-lg">
				<CardContent className="p-4">
					<div className="space-y-3">
						<div className="w-full h-2 bg-slate-200 rounded-full" />
						<div className="w-3/4 h-2 bg-slate-200 rounded-full" />
						<div className="w-5/6 h-2 bg-slate-200 rounded-full" />
						<div className="w-2/3 h-2 bg-slate-200 rounded-full" />

						<div className="flex justify-center mt-4">
							<Badge className="">Original Post</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Pulse effect around center */}
			<motion.div
				className="absolute rounded-full border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
				initial={{ width: 100, height: 100, opacity: 0.8 }}
				animate={
					animate
						? {
								width: 400,
								height: 400,
								opacity: 0,
								borderWidth: 0.5,
							}
						: { width: 50, height: 50, opacity: 0.8 }
				}
				transition={{
					duration: 2,
					repeat: Number.POSITIVE_INFINITY,
					repeatType: "loop",
					ease: "easeOut",
				}}
			/>

			<motion.div
				className="absolute rounded-full border-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
				initial={{ width: 80, height: 80, opacity: 0.8 }}
				animate={
					animate
						? {
								width: 380,
								height: 380,
								opacity: 0,
								borderWidth: 0.5,
							}
						: { width: 40, height: 40, opacity: 0.8 }
				}
				transition={{
					duration: 2,
					delay: 0.3,
					repeat: Number.POSITIVE_INFINITY,
					repeatType: "loop",
					ease: "easeOut",
				}}
			/>

			<motion.div
				className="absolute rounded-full border-2 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
				initial={{ width: 60, height: 60, opacity: 0.8 }}
				animate={
					animate
						? {
								width: 360,
								height: 360,
								opacity: 0,
								borderWidth: 0.5,
							}
						: { width: 30, height: 30, opacity: 0.8 }
				}
				transition={{
					duration: 2,
					delay: 0.6,
					repeat: Number.POSITIVE_INFINITY,
					repeatType: "loop",
					ease: "easeOut",
				}}
			/>
		</div>
	);
}
