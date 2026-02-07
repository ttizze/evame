import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ABOUT_SECTION_HEADING_CLASS =
	"text-3xl md:text-4xl font-semibold tracking-tight";

export const ABOUT_FEATURE_BASE_CLASS =
	"relative flex flex-col gap-8 md:gap-12 items-center overflow-x-clip";

export const ABOUT_FEATURE_PANEL_CLASS =
	"rounded-2xl border border-border/60 bg-muted/40 p-6 md:p-8 shadow-inner";

export function AboutSectionContent({
	children,
	className,
	containerClassName,
	withVerticalPadding = false,
}: {
	children: ReactNode;
	className?: string;
	containerClassName?: string;
	withVerticalPadding?: boolean;
}) {
	return (
		<section
			className={cn(withVerticalPadding ? "py-16 md:py-24" : "", className)}
		>
			<div className={cn("mx-auto max-w-5xl", containerClassName)}>
				{children}
			</div>
		</section>
	);
}
