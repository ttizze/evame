import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fetchAboutPage } from "../../service/fetch-about-page";
import { ABOUT_FEATURE_BASE_CLASS, ABOUT_FEATURE_PANEL_CLASS } from "../layout";

type FeatureDirection = "default" | "reverse";

export async function fetchFeatureHeaderAndText({
	locale,
	headerNumber,
	textNumber,
}: {
	locale: string;
	headerNumber: number;
	textNumber: number;
}) {
	const pageDetail = await fetchAboutPage(locale);
	const header = pageDetail.segments.find(
		(segment) => segment.number === headerNumber,
	);
	const text = pageDetail.segments.find(
		(segment) => segment.number === textNumber,
	);

	if (!header || !text) {
		return null;
	}

	return { pageDetail, header, text };
}

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
			<div className="relative flex-1 min-w-0">
				<h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
					{header}
				</h3>
				<p className="mt-4 text-base md:text-lg leading-relaxed">{text}</p>
			</div>
			<div className="relative flex-1 w-full">
				{hint ? (
					<p className="mb-2 text-xs text-muted-foreground text-center">
						{hint}
					</p>
				) : null}
				<div className={ABOUT_FEATURE_PANEL_CLASS}>{panel}</div>
			</div>
		</article>
	);
}
