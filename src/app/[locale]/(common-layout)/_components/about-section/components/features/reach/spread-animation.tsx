"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const LANGUAGES = [
	{ code: "jp", flag: "jp", name: "Japanese" },
	{ code: "us", flag: "us", name: "English" },
	{ code: "kr", flag: "kr", name: "Korean" },
	{ code: "fr", flag: "fr", name: "French" },
	{ code: "es", flag: "es", name: "Spanish" },
	{ code: "de", flag: "de", name: "German" },
	{ code: "cn", flag: "cn", name: "Chinese" },
	{ code: "it", flag: "it", name: "Italian" },
];

const CENTER_SIZE = 108;

export function SpreadAnimation() {
	const [animate, setAnimate] = useState(false);
	const [radius, setRadius] = useState(160);

	useEffect(() => {
		const calc = () => {
			const container = document.querySelector("[data-spread-container]");
			if (!container) return;
			const containerWidth = container.clientWidth;
			const badgeWidth = 60;
			const margin = 16;
			const r = Math.max(
				120,
				Math.min(180, (containerWidth - CENTER_SIZE - badgeWidth - margin) / 2),
			);
			setRadius(r);
		};
		calc();
		window.addEventListener("resize", calc);
		return () => window.removeEventListener("resize", calc);
	}, []);

	useEffect(() => {
		const timer = setTimeout(() => setAnimate(true), 100);
		const interval = setInterval(() => {
			setAnimate(false);
			setTimeout(() => setAnimate(true), 800);
		}, 4000);
		return () => {
			clearTimeout(timer);
			clearInterval(interval);
		};
	}, []);

	const ringSizes = [radius * 2 + 24, radius * 2 + 8, radius * 2 - 8];

	return (
		<div
			className="relative w-full h-[420px] sm:h-[480px] flex items-center justify-center overflow-hidden rounded-xl"
			data-spread-container
		>
			{LANGUAGES.map((lang, i) => {
				const angle = (i * 360) / LANGUAGES.length;
				const rad = (angle * Math.PI) / 180;
				const x = Math.cos(rad) * radius;
				const y = Math.sin(rad) * radius;

				return (
					<motion.div
						animate={
							animate
								? { x, y, scale: 1, opacity: 1 }
								: { scale: 0, opacity: 0 }
						}
						className="absolute flex flex-col items-center"
						initial={{ x, y, scale: 0, opacity: 0 }}
						key={lang.code}
						transition={{
							duration: 0.7,
							delay: i * 0.08,
							type: "spring",
							stiffness: 100,
						}}
					>
						<motion.div
							className="z-10 flex items-center justify-center w-9 h-9 rounded-full border overflow-hidden bg-white"
							whileHover={{ scale: 1.1 }}
						>
							<Image
								alt={lang.name}
								className="object-cover w-full h-full"
								height={36}
								src={`https://flagcdn.com/w80/${lang.flag}.png`}
								width={36}
							/>
						</motion.div>
						<Badge className="mt-1 text-xs px-1.5 py-0" variant="secondary">
							{lang.name}
						</Badge>
					</motion.div>
				);
			})}

			<Card className="relative z-20 shadow-lg w-32">
				<CardContent className="p-4">
					<div className="space-y-3">
						<div className="w-full h-2 bg-slate-200 rounded-full" />
						<div className="w-3/4 h-2 bg-slate-200 rounded-full" />
						<div className="w-5/6 h-2 bg-slate-200 rounded-full" />
						<div className="w-2/3 h-2 bg-slate-200 rounded-full" />
						<div className="flex justify-center mt-4">
							<Badge>Original</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{ringSizes.map((size, idx) => (
				<motion.div
					animate={
						animate
							? { width: size, height: size, opacity: 0, borderWidth: 0.5 }
							: { width: size * 0.15, height: size * 0.15, opacity: 0.8 }
					}
					className={`absolute rounded-full border-2 ${
						idx === 0
							? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]"
							: idx === 1
								? "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.45)]"
								: "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.45)]"
					}`}
					initial={{ width: size * 0.25, height: size * 0.25, opacity: 0.8 }}
					key={size}
					transition={{
						duration: 2,
						delay: idx * 0.25,
						repeat: Number.POSITIVE_INFINITY,
						repeatType: "loop",
						ease: "easeOut",
					}}
				/>
			))}
		</div>
	);
}
