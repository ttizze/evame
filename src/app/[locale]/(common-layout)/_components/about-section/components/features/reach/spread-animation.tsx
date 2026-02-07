"use client";

import Image from "next/image";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import styles from "./spread-animation.module.css";

const LANGUAGES = [
	{ code: "jp", flagPath: "/flags/jp.png", name: "Japanese" },
	{ code: "us", flagPath: "/flags/us.png", name: "English" },
	{ code: "kr", flagPath: "/flags/kr.png", name: "Korean" },
	{ code: "fr", flagPath: "/flags/fr.png", name: "French" },
	{ code: "es", flagPath: "/flags/es.png", name: "Spanish" },
	{ code: "de", flagPath: "/flags/de.png", name: "German" },
	{ code: "cn", flagPath: "/flags/cn.png", name: "Chinese" },
	{ code: "it", flagPath: "/flags/it.png", name: "Italian" },
];

const CENTER_SIZE = 108;

export function SpreadAnimation() {
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
					<div
						className={`absolute flex flex-col items-center ${styles.burstItem}`}
						key={lang.code}
						style={
							{
								"--x": `${x}px`,
								"--y": `${y}px`,
								animationDelay: `${i * 0.08}s`,
							} as CSSProperties
						}
					>
						<div className="z-10 flex items-center justify-center w-9 h-9 rounded-full border overflow-hidden bg-white transition-transform duration-150 hover:scale-110">
							<Image
								alt={`${lang.name} flag`}
								className="object-cover w-full h-full"
								height={36}
								src={lang.flagPath}
								width={36}
							/>
						</div>
						<Badge className="mt-1 text-xs px-1.5 py-0" variant="secondary">
							{lang.name}
						</Badge>
					</div>
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
				<div
					className={`absolute rounded-full border-2 ${styles.ring} ${
						idx === 0
							? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.45)]"
							: idx === 1
								? "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.45)]"
								: "border-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.45)]"
					}`}
					key={size}
					style={
						{
							width: size,
							height: size,
							animationDelay: `${idx * 0.25}s`,
						} as CSSProperties
					}
				/>
			))}
		</div>
	);
}
