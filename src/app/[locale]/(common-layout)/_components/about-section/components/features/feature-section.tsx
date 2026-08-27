import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ABOUT_FEATURE_BASE_CLASS, ABOUT_FEATURE_PANEL_CLASS } from "../layout";

type FeatureDirection = "default" | "reverse";

export function FeatureSection({
	header,
	text,
	panel,
	decorationClassName,
	direction = "default",
	hint,
}: {
	header: ReactNode;
	text: ReactNode;
	panel: ReactNode;
	decorationClassName: string;
	direction?: FeatureDirection;
	hint?: ReactNode;
}) {
	return (
		<article
			className={cn(
				ABOUT_FEATURE_BASE_CLASS,
				direction === "reverse" ? "md:flex-row-reverse" : "md:flex-row",
			)}
		>
			<div
				aria-hidden="true"
				className={cn(
					"pointer-events-none absolute rounded-full opacity-70 blur-3xl",
					decorationClassName,
				)}
			/>
			<div className="relative min-w-0 flex-1">
				<h3 className="text-2xl font-semibold tracking-tight md:text-3xl">
					{header}
				</h3>
				<p className="mt-4 text-base leading-relaxed md:text-lg">{text}</p>
			</div>
			<div className="relative w-full flex-1">
				{hint ? (
					<p className="mb-2 text-center text-xs text-muted-foreground">
						{hint}
					</p>
				) : null}
				<div className={ABOUT_FEATURE_PANEL_CLASS}>{panel}</div>
			</div>
		</article>
	);
}
