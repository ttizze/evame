import Image from "next/image";

type BurstLine = {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	weight: number;
	color: string;
	opacity: number;
};

const viewBox = { width: 800, height: 800 };
const rayCenter = { x: 400, y: 400 };

const snap = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));
const lerp = (min: number, max: number, ratio: number) =>
	min + (max - min) * ratio;
const fract = (value: number) => value - Math.floor(value);
const seeded = (seed: number) => fract(Math.sin(seed * 12.9898) * 43758.5453);

const rayPalette: readonly string[] = [
	"hsl(198 100% 70%)",
	"hsl(185 100% 62%)",
	"hsl(155 95% 58%)",
	"hsl(115 95% 58%)",
	"hsl(55 100% 62%)",
	"hsl(26 100% 62%)",
	"hsl(0 100% 68%)",
	"hsl(292 90% 70%)",
];

type BurstConfig = {
	count: number;
	angleStart: number;
	angleEnd: number;
	innerMin: number;
	innerMax: number;
	outerMin: number;
	outerMax: number;
	weightMin: number;
	weightMax: number;
	opacityMin: number;
	opacityMax: number;
	angleJitter: number;
	colorShift: number;
	direction?: "out" | "in";
	color?: string;
	usePalette?: boolean;
	whiteChance?: number;
	whiteBoost?: number;
	extraLengthChance?: number;
	extraLength?: number;
};

const buildBurstLines = ({
	count,
	angleStart,
	angleEnd,
	innerMin,
	innerMax,
	outerMin,
	outerMax,
	weightMin,
	weightMax,
	opacityMin,
	opacityMax,
	angleJitter,
	colorShift,
	direction = "out",
	color,
	usePalette = true,
	whiteChance = 0,
	whiteBoost = 1,
	extraLengthChance = 0,
	extraLength = 0,
}: BurstConfig): BurstLine[] =>
	Array.from({ length: count }, (_, index) => {
		const seed = index + 1 + colorShift * 13;
		const r0 = seeded(seed);
		const r1 = seeded(seed + 2.1);
		const r2 = seeded(seed + 4.7);
		const r3 = seeded(seed + 7.9);
		const r4 = seeded(seed + 12.3);

		const angleDeg =
			lerp(angleStart, angleEnd, (index + r0) / count) +
			(r1 - 0.5) * angleJitter;
		const angle = (angleDeg * Math.PI) / 180;
		const inner = lerp(innerMin, innerMax, r2);
		let outer = lerp(outerMin, outerMax, r3);

		if (
			extraLengthChance > 0 &&
			extraLength > 0 &&
			r4 > 1 - extraLengthChance
		) {
			outer += extraLength * (0.45 + r4 * 0.55);
		}

		const cos = Math.cos(angle);
		const sin = Math.sin(angle);

		const paletteColor = usePalette
			? (rayPalette[
					Math.floor(
						(index + r2 * rayPalette.length + colorShift * 5) %
							rayPalette.length,
					)
				] ?? "hsl(0 0% 100%)")
			: "hsl(0 0% 100%)";
		let finalColor = color ?? paletteColor;
		let weight = lerp(weightMin, weightMax, r4);

		if (whiteChance > 0 && r1 > 1 - whiteChance) {
			finalColor = "hsl(0 0% 100%)";
			weight *= whiteBoost;
		}

		const xInner = rayCenter.x + cos * inner;
		const yInner = rayCenter.y + sin * inner;
		const xOuter = rayCenter.x + cos * outer;
		const yOuter = rayCenter.y + sin * outer;

		const isOutgoing = direction === "out";

		return {
			x1: snap(isOutgoing ? xInner : xOuter),
			y1: snap(isOutgoing ? yInner : yOuter),
			x2: snap(isOutgoing ? xOuter : xInner),
			y2: snap(isOutgoing ? yOuter : yInner),
			weight: snap(weight),
			color: finalColor,
			opacity: clamp(lerp(opacityMin, opacityMax, r0), 0.05, 1),
		};
	});

const incomingLines = buildBurstLines({
	count: 90,
	angleStart: 160,
	angleEnd: 200,
	direction: "in",
	innerMin: 10,
	innerMax: 22,
	outerMin: 320,
	outerMax: 620,
	weightMin: 0.7,
	weightMax: 2.4,
	opacityMin: 0.28,
	opacityMax: 0.7,
	angleJitter: 1.6,
	colorShift: 0,
	color: "var(--hero-ray-incoming)",
	usePalette: false,
});

const incomingSparkLines = buildBurstLines({
	count: 50,
	angleStart: 158,
	angleEnd: 202,
	direction: "in",
	innerMin: 12,
	innerMax: 26,
	outerMin: 260,
	outerMax: 560,
	weightMin: 1.2,
	weightMax: 3.2,
	opacityMin: 0.22,
	opacityMax: 0.55,
	angleJitter: 2.2,
	colorShift: 0.8,
	color: "var(--hero-ray-incoming)",
	usePalette: false,
});

const outgoingBurstLines = buildBurstLines({
	count: 230,
	angleStart: -56,
	angleEnd: 56,
	innerMin: 8,
	innerMax: 22,
	outerMin: 260,
	outerMax: 640,
	weightMin: 0.4,
	weightMax: 3.2,
	opacityMin: 0.55,
	opacityMax: 0.95,
	angleJitter: 1.1,
	colorShift: 0,
	whiteChance: 0.12,
	whiteBoost: 1.5,
	extraLengthChance: 0.34,
	extraLength: 220,
});

const outgoingSparkLines = buildBurstLines({
	count: 160,
	angleStart: -64,
	angleEnd: 64,
	innerMin: 12,
	innerMax: 26,
	outerMin: 140,
	outerMax: 380,
	weightMin: 1.4,
	weightMax: 5.6,
	opacityMin: 0.35,
	opacityMax: 0.92,
	angleJitter: 1.6,
	colorShift: 1.6,
	whiteChance: 0.22,
	whiteBoost: 1.25,
});

const outgoingCoreLines = buildBurstLines({
	count: 54,
	angleStart: -75,
	angleEnd: 75,
	innerMin: 6,
	innerMax: 16,
	outerMin: 90,
	outerMax: 190,
	weightMin: 2.4,
	weightMax: 6.4,
	opacityMin: 0.45,
	opacityMax: 0.8,
	angleJitter: 2,
	colorShift: 2.4,
	whiteChance: 0.45,
	whiteBoost: 1.2,
});

type RenderOptions = {
	key: string;
	weightScale: number;
	opacityScale: number;
	stroke?: string;
};

const screenBlend = { mixBlendMode: "screen" } as const;

const renderLines = (lines: BurstLine[], options: RenderOptions) =>
	lines.map((line, index) => (
		<line
			key={`${options.key}-${index}-${line.x2}-${line.y2}`}
			stroke={options.stroke ?? line.color}
			strokeOpacity={clamp(line.opacity * options.opacityScale, 0, 1)}
			strokeWidth={line.weight * options.weightScale}
			x1={line.x1}
			x2={line.x2}
			y1={line.y1}
			y2={line.y2}
		/>
	));

const renderBurstAndSpark = (
	key: string,
	burst: Omit<RenderOptions, "key">,
	spark: Omit<RenderOptions, "key">,
) => (
	<>
		{renderLines(outgoingBurstLines, { key: `${key}-burst`, ...burst })}
		{renderLines(outgoingSparkLines, { key: `${key}-spark`, ...spark })}
	</>
);

export const HeroRays = () => {
	return (
		<div className="relative my-10 flex h-[360px] items-center justify-center">
			<svg
				aria-hidden="true"
				className="absolute inset-0 h-full w-full hero-rays"
				preserveAspectRatio="xMidYMid slice"
				shapeRendering="geometricPrecision"
				viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
			>
				<defs>
					<radialGradient
						cx={rayCenter.x}
						cy={rayCenter.y}
						gradientUnits="userSpaceOnUse"
						id="hero-rays-fade"
						r="560"
					>
						<stop offset="0" stopColor="white" stopOpacity="1" />
						<stop offset="0.7" stopColor="white" stopOpacity="1" />
						<stop offset="0.9" stopColor="white" stopOpacity="0.55" />
						<stop offset="1" stopColor="white" stopOpacity="0" />
					</radialGradient>
					<radialGradient
						cx={rayCenter.x}
						cy={rayCenter.y}
						gradientUnits="userSpaceOnUse"
						id="hero-rays-neon-fade"
						r="640"
					>
						<stop offset="0" stopColor="white" stopOpacity="1" />
						<stop offset="0.55" stopColor="white" stopOpacity="1" />
						<stop offset="0.8" stopColor="white" stopOpacity="0.7" />
						<stop offset="0.93" stopColor="white" stopOpacity="0.35" />
						<stop offset="1" stopColor="white" stopOpacity="0" />
					</radialGradient>
					<radialGradient
						cx={rayCenter.x}
						cy={rayCenter.y}
						gradientUnits="userSpaceOnUse"
						id="hero-rays-vignette"
						r="460"
					>
						<stop offset="0" stopColor="black" stopOpacity="0" />
						<stop offset="0.7" stopColor="black" stopOpacity="0" />
						<stop offset="1" stopColor="black" stopOpacity="0.1" />
					</radialGradient>
					<mask
						height={viewBox.height}
						id="hero-rays-mask"
						maskUnits="userSpaceOnUse"
						width={viewBox.width}
						x="0"
						y="0"
					>
						<rect
							fill="url(#hero-rays-fade)"
							height={viewBox.height}
							width={viewBox.width}
							x="0"
							y="0"
						/>
					</mask>
					<mask
						height={viewBox.height}
						id="hero-rays-neon-mask"
						maskUnits="userSpaceOnUse"
						width={viewBox.width}
						x="0"
						y="0"
					>
						<rect
							fill="url(#hero-rays-neon-fade)"
							height={viewBox.height}
							width={viewBox.width}
							x="0"
							y="0"
						/>
					</mask>
					<filter
						colorInterpolationFilters="sRGB"
						filterUnits="userSpaceOnUse"
						height={viewBox.height}
						id="hero-rays-glow"
						width={viewBox.width}
						x="0"
						y="0"
					>
						<feGaussianBlur in="SourceGraphic" stdDeviation="10" />
					</filter>
					<filter
						colorInterpolationFilters="sRGB"
						filterUnits="userSpaceOnUse"
						height="300%"
						id="hero-rays-neon"
						width="300%"
						x="-100%"
						y="-100%"
					>
						<feGaussianBlur
							in="SourceGraphic"
							result="blur1"
							stdDeviation="4.5"
						/>
						<feGaussianBlur
							in="SourceGraphic"
							result="blur2"
							stdDeviation="15"
						/>
						<feGaussianBlur
							in="SourceGraphic"
							result="blur3"
							stdDeviation="34"
						/>
						<feGaussianBlur
							in="SourceGraphic"
							result="blur4"
							stdDeviation="62"
						/>
						<feComponentTransfer in="blur4" result="blur4soft">
							<feFuncA slope="0.7" type="linear" />
						</feComponentTransfer>
						<feComponentTransfer in="blur2" result="blur2hot">
							<feFuncA slope="1.25" type="linear" />
						</feComponentTransfer>
						<feColorMatrix
							in="blur3"
							result="boost"
							type="matrix"
							values="2.8 0 0 0 0 0 2.8 0 0 0 0 0 2.8 0 0 0 0 0 1.2 0"
						/>
						<feMerge>
							<feMergeNode in="blur4soft" />
							<feMergeNode in="blur3" />
							<feMergeNode in="boost" />
							<feMergeNode in="blur2hot" />
							<feMergeNode in="blur1" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
					<filter
						colorInterpolationFilters="sRGB"
						filterUnits="userSpaceOnUse"
						height={viewBox.height}
						id="hero-rays-wash"
						width={viewBox.width}
						x="0"
						y="0"
					>
						<feGaussianBlur in="SourceGraphic" stdDeviation="20" />
					</filter>
				</defs>
				<g fill="none" strokeLinecap="round" strokeLinejoin="round">
					<g mask="url(#hero-rays-mask)">
						<g opacity={0.6} style={screenBlend}>
							{renderLines(incomingLines, {
								key: "incoming",
								weightScale: 1,
								opacityScale: 1,
								stroke: "var(--hero-ray-incoming)",
							})}
						</g>
						<g
							className="hero-rays-flow-in hero-rays-glitter hero-rays-drift-in"
							opacity={0.7}
							style={screenBlend}
						>
							{renderLines(incomingSparkLines, {
								key: "incoming-flow",
								weightScale: 1.15,
								opacityScale: 1,
								stroke: "var(--hero-ray-incoming)",
							})}
						</g>
						<g filter="url(#hero-rays-wash)" opacity={0.42} style={screenBlend}>
							{renderBurstAndSpark(
								"wash",
								{ weightScale: 4.8, opacityScale: 0.34 },
								{ weightScale: 3.6, opacityScale: 0.3 },
							)}
						</g>
						<g
							className="hero-rays-drift-out"
							filter="url(#hero-rays-glow)"
							opacity={0.64}
							style={screenBlend}
						>
							{renderBurstAndSpark(
								"glow",
								{ weightScale: 2.6, opacityScale: 0.68 },
								{ weightScale: 2.1, opacityScale: 0.54 },
							)}
						</g>
						<g opacity={0.92}>
							{renderBurstAndSpark(
								"core",
								{ weightScale: 1, opacityScale: 1 },
								{ weightScale: 1, opacityScale: 1 },
							)}
							{renderLines(outgoingCoreLines, {
								key: "core-white",
								weightScale: 0.9,
								opacityScale: 1,
							})}
						</g>
						<g
							className="hero-rays-flow-out hero-rays-glitter hero-rays-drift-out"
							opacity={0.8}
							style={screenBlend}
						>
							{renderLines(outgoingSparkLines, {
								key: "flow-spark",
								weightScale: 0.9,
								opacityScale: 0.75,
								stroke: "white",
							})}
						</g>
						<g
							className="hero-rays-glitter"
							filter="url(#hero-rays-glow)"
							opacity={0.7}
							style={screenBlend}
						>
							{renderLines(outgoingCoreLines, {
								key: "glitter-core",
								weightScale: 1.15,
								opacityScale: 0.7,
								stroke: "white",
							})}
						</g>
					</g>
					<g
						className="hero-rays-neon-pulse"
						filter="url(#hero-rays-neon)"
						mask="url(#hero-rays-neon-mask)"
						opacity={0.9}
						style={screenBlend}
					>
						{renderBurstAndSpark(
							"neon",
							{ weightScale: 5.8, opacityScale: 1 },
							{ weightScale: 4.6, opacityScale: 0.98 },
						)}
					</g>
				</g>
				<rect
					fill="url(#hero-rays-vignette)"
					height={viewBox.height}
					opacity={0.4}
					width={viewBox.width}
					x="0"
					y="0"
				/>
			</svg>
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
