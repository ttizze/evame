import Image from "next/image";

type RayLine = {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	weight: number;
	curve?: number;
	color?: string;
};

const rayCenter = { x: 400, y: 80 };
const rayBounds = { width: 800, height: 160 };
const rayOverlap = 0;
const snap = (value: number) => Math.round(value * 100) / 100;
const rightBlendStart = rayCenter.x + 80;
const rightBlendEnd = rayCenter.x + 260;
const rightBlendStartOffset = snap(
	(rightBlendStart - rayCenter.x) / (rayBounds.width - rayCenter.x),
);
const rightBlendEndOffset = snap(
	(rightBlendEnd - rayCenter.x) / (rayBounds.width - rayCenter.x),
);

const buildAngleSpecs = (
	angles: number[],
	minWeight: number,
	maxWeight: number,
) => {
	const centerIndex = (angles.length - 1) / 2;

	return angles.map((angle, index) => {
		const edgeRatio =
			centerIndex === 0 ? 0 : Math.abs(index - centerIndex) / centerIndex;
		const weight = snap(minWeight + edgeRatio * (maxWeight - minWeight));

		return { angle, weight };
	});
};

const buildCurvePath = (line: RayLine) => {
	return `M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`;
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const rightNearWeight = (weight: number) =>
	snap(clamp(weight * 0.25, 0.7, 2.4));
const rightFarWeight = (weight: number) => weight;

const toEdgeY = (angleDeg: number, xTarget: number) => {
	const angle = (angleDeg * Math.PI) / 180;
	const cosine = Math.cos(angle);

	if (Math.abs(cosine) < 0.001) {
		return null;
	}

	const t = (xTarget - rayCenter.x) / cosine;
	return snap(rayCenter.y + t * Math.sin(angle));
};

const buildLeftLines = (
	specs: { angle: number; weight: number }[],
): RayLine[] =>
	specs
		.map(({ angle, weight }) => {
			const y = toEdgeY(angle, 0);

			if (y === null || y < -10 || y > rayBounds.height + 10) {
				return null;
			}

			const line: RayLine = {
				x1: 0,
				y1: y,
				x2: rayCenter.x + rayOverlap,
				y2: rayCenter.y,
				weight,
			};

			return line;
		})
		.filter((line): line is RayLine => line !== null);

const buildRightLines = (
	specs: { angle: number; weight: number }[],
	color: string,
	phase: number,
): RayLine[] =>
	specs
		.map(({ angle, weight }) => {
			const y = toEdgeY(angle, rayBounds.width);

			if (y === null || y < -10 || y > rayBounds.height + 10) {
				return null;
			}

			const waveAmplitude = 10 + weight * 4.5;
			const curve = snap(
				Math.sin((((angle + phase) * Math.PI) / 180) * 3) * waveAmplitude,
			);

			const line: RayLine = {
				x1: rayCenter.x - rayOverlap,
				y1: rayCenter.y,
				x2: rayBounds.width,
				y2: y,
				weight,
				curve,
				color,
			};

			return line;
		})
		.filter((line): line is RayLine => line !== null);

const buildRightSeries = (
	angles: number[],
	minWeight: number,
	maxWeight: number,
	color: string,
	phase: number,
) =>
	buildRightLines(buildAngleSpecs(angles, minWeight, maxWeight), color, phase);

const leftAngles = Array.from({ length: 30 }, (_, index) => 160 + index * 1.3);
const baseRightAngles = Array.from(
	{ length: 12 },
	(_, index) => -20 + index * 3.6,
);
const redAngles = baseRightAngles.filter((angle) => Math.abs(angle) > 1.8);
const greenAngles = baseRightAngles.map((angle) => angle + 1.2);
const blueAngles = baseRightAngles.map((angle) => angle - 1.2);
const centerRightAngles = Array.from(
	{ length: 9 },
	(_, index) => -6 + index * 1.5,
);
const centerRedAngles = centerRightAngles.filter(
	(angle) => Math.abs(angle) > 0.4,
);
const centerGreenAngles = centerRightAngles.map((angle) => angle + 0.6);
const centerBlueAngles = centerRightAngles.map((angle) => angle - 0.6);

const leftRayLines = buildLeftLines(buildAngleSpecs(leftAngles, 1, 2.9));
const outerRightSeries = [
	{
		angles: redAngles,
		minWeight: 0.25,
		maxWeight: 11.2,
		color: "var(--ray-red)",
		phase: 0,
	},
	{
		angles: greenAngles,
		minWeight: 0.2,
		maxWeight: 10.4,
		color: "var(--ray-green)",
		phase: 18,
	},
	{
		angles: blueAngles,
		minWeight: 0.2,
		maxWeight: 10.4,
		color: "var(--ray-blue)",
		phase: -18,
	},
];
const centerRightSeries = [
	{
		angles: centerRedAngles,
		minWeight: 0.8,
		maxWeight: 3.1,
		color: "var(--ray-red)",
		phase: 0,
	},
	{
		angles: centerGreenAngles,
		minWeight: 0.6,
		maxWeight: 2.4,
		color: "var(--ray-green)",
		phase: 6,
	},
	{
		angles: centerBlueAngles,
		minWeight: 0.6,
		maxWeight: 2.4,
		color: "var(--ray-blue)",
		phase: -6,
	},
];
const rightRayLines = [
	...outerRightSeries.flatMap((series) =>
		buildRightSeries(
			series.angles,
			series.minWeight,
			series.maxWeight,
			series.color,
			series.phase,
		),
	),
	...centerRightSeries.flatMap((series) =>
		buildRightSeries(
			series.angles,
			series.minWeight,
			series.maxWeight,
			series.color,
			series.phase,
		),
	),
];

export const HeroRays = () => {
	return (
		<div className="relative my-10 flex justify-center">
			<svg
				aria-hidden="true"
				className="absolute inset-0 h-full w-full hero-rays"
				preserveAspectRatio="none"
				shapeRendering="geometricPrecision"
				viewBox="0 0 800 160"
			>
				<defs>
					<linearGradient
						gradientUnits="userSpaceOnUse"
						id="hero-rays-near-gradient"
						x1={rayCenter.x}
						x2={rayBounds.width}
						y1="0"
						y2="0"
					>
						<stop offset="0" stopColor="white" />
						<stop offset={rightBlendStartOffset} stopColor="white" />
						<stop offset={rightBlendEndOffset} stopColor="black" />
						<stop offset="1" stopColor="black" />
					</linearGradient>
					<linearGradient
						gradientUnits="userSpaceOnUse"
						id="hero-rays-far-gradient"
						x1={rayCenter.x}
						x2={rayBounds.width}
						y1="0"
						y2="0"
					>
						<stop offset="0" stopColor="black" />
						<stop offset={rightBlendStartOffset} stopColor="black" />
						<stop offset={rightBlendEndOffset} stopColor="white" />
						<stop offset="1" stopColor="white" />
					</linearGradient>
					<mask
						height={rayBounds.height}
						id="hero-rays-mask-near"
						maskUnits="userSpaceOnUse"
						width={rayBounds.width - rayCenter.x}
						x={rayCenter.x}
						y="0"
					>
						<rect
							fill="url(#hero-rays-near-gradient)"
							height={rayBounds.height}
							width={rayBounds.width - rayCenter.x}
							x={rayCenter.x}
							y="0"
						/>
					</mask>
					<mask
						height={rayBounds.height}
						id="hero-rays-mask-far"
						maskUnits="userSpaceOnUse"
						width={rayBounds.width - rayCenter.x}
						x={rayCenter.x}
						y="0"
					>
						<rect
							fill="url(#hero-rays-far-gradient)"
							height={rayBounds.height}
							width={rayBounds.width - rayCenter.x}
							x={rayCenter.x}
							y="0"
						/>
					</mask>
				</defs>
				<g fill="none" strokeLinecap="round" strokeLinejoin="round">
					<g stroke="currentColor">
						{leftRayLines.map((line) => (
							<line
								key={`left-ray-${line.x1}-${line.y1}-${line.x2}-${line.y2}`}
								strokeWidth={line.weight}
								x1={line.x1}
								x2={line.x2}
								y1={line.y1}
								y2={line.y2}
							/>
						))}
					</g>
					<g mask="url(#hero-rays-mask-near)">
						{rightRayLines.map((line) => (
							<path
								d={buildCurvePath(line)}
								key={`right-near-ray-${line.x1}-${line.y1}-${line.x2}-${line.y2}-${line.color}`}
								stroke={line.color}
								strokeWidth={rightNearWeight(line.weight)}
							/>
						))}
					</g>
					<g mask="url(#hero-rays-mask-far)">
						{rightRayLines.map((line) => (
							<path
								d={buildCurvePath(line)}
								key={`right-far-ray-${line.x1}-${line.y1}-${line.x2}-${line.y2}-${line.color}`}
								stroke={line.color}
								strokeWidth={rightFarWeight(line.weight)}
							/>
						))}
					</g>
				</g>
			</svg>
			<Image
				alt="Hero section image"
				className="relative z-10 dark:invert"
				height={100}
				src="/favicon.svg"
				width={100}
			/>
		</div>
	);
};
