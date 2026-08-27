const LANGUAGES = [
	["ja", "日本語"],
	["en", "English"],
	["zh", "中文"],
	["ko", "한국어"],
	["es", "Español"],
	["pi", "Pāli"],
] as const;

export function SpreadAnimation() {
	return (
		<div
			className="relative flex h-[300px] w-full items-center justify-center overflow-hidden rounded-xl bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.16),transparent_65%)] sm:h-[360px]"
			data-spread-container="true"
		>
			<div className="absolute h-32 w-32 rounded-full border border-emerald-400/40" />
			<div className="absolute h-48 w-48 rounded-full border border-emerald-400/25" />
			<div className="absolute h-64 w-64 rounded-full border border-emerald-400/15" />
			<div className="z-10 flex h-24 w-24 items-center justify-center rounded-full border border-border/60 bg-background/90 text-sm font-semibold shadow-lg">
				Pāli
			</div>
			{LANGUAGES.map(([code, name], index) => {
				const angle = (index * 360) / LANGUAGES.length;
				return (
					<span
						className="absolute rounded-full border border-border/60 bg-background/90 px-2 py-1 text-xs shadow-sm"
						key={code}
						style={{
							transform: `rotate(${angle}deg) translateY(-${Math.min(132, 92 + index * 4)}px) rotate(-${angle}deg)`,
						}}
					>
						{name}
					</span>
				);
			})}
		</div>
	);
}
