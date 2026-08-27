"use client";

import type { ReactNode } from "react";
import { buildLoginHref } from "@/components/scripture/login-link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StartButtonProps = {
	className?: string;
	text?: string;
	icon?: ReactNode;
	locale?: string;
};

export function StartButton({
	className,
	text = "Start",
	icon,
	locale = "en",
}: StartButtonProps) {
	const currentPath =
		typeof window === "undefined"
			? `/${locale}`
			: `${window.location.pathname}${window.location.search}`;
	const loginHref = buildLoginHref(locale, currentPath);

	return (
		<Button
			asChild
			className={cn(
				"relative rounded-full",
				/* ---- Inner highlight ---- */
				"before:absolute before:inset-0 before:rounded-full",
				"before:bg-[linear-gradient(145deg,rgba(255,255,255,0.35)_0%,rgba(255,255,255,0.05)_40%,transparent_80%)]",
				/* ---- Outer glow ---- */
				"after:absolute after:inset-0 after:rounded-full",
				"after:opacity-100 after:shadow-[0_0_20px_4px_rgba(255,255,255,0.12)]",
				className,
			)}
			size="lg"
			variant="default"
		>
			<a href={loginHref}>
				<span className="flex items-center gap-2">
					{icon}
					<span className="sr-only">login and start</span>
					{text}
				</span>
			</a>
		</Button>
	);
}
