"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export type View = "user" | "source" | "both";

function readView(): View {
	if (typeof window === "undefined") return "both";
	const value = new URLSearchParams(window.location.search).get("view");
	return value === "user" || value === "source" || value === "both"
		? value
		: "both";
}

function replaceViewQuery(view: View) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	url.searchParams.set("view", view);
	window.history.replaceState(window.history.state, "", url);
	window.dispatchEvent(
		new CustomEvent("scripture-view-change", { detail: view }),
	);
}

export function ViewCycle({
	afterClick,
	userLocale,
	sourceLocale,
}: {
	afterClick?: () => void;
	userLocale: string;
	sourceLocale: string;
}) {
	const [view, setView] = useState<View>(readView);

	useEffect(() => {
		const handlePopState = () => setView(readView());
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, []);

	const sourceLabel =
		sourceLocale === "mixed" ? (
			<FileText
				aria-hidden="true"
				className="h-5 w-5"
				data-testid="source-mixed-icon"
			/>
		) : (
			<span>{sourceLocale.toUpperCase()}</span>
		);
	const nextView: View =
		view === "user" ? "source" : view === "source" ? "both" : "user";
	const label =
		view === "user"
			? "Currently: User language only (Click to change)"
			: view === "source"
				? "Currently: Source only (Click to change)"
				: "Currently: Both languages (Click to change)";

	return (
		<Button
			aria-label={label}
			className="h-10 rounded-full bg-background px-3 text-xs font-semibold"
			onClick={() => {
				setView(nextView);
				replaceViewQuery(nextView);
				afterClick?.();
			}}
			title={label}
			variant="ghost"
		>
			{view === "user" ? (
				<span>{userLocale.toUpperCase()}</span>
			) : view === "source" ? (
				sourceLabel
			) : (
				<span className="flex items-center gap-1 scale-90">
					<span className="text-[10px] leading-none">
						{userLocale.toUpperCase()}
					</span>
					<span className="text-[10px] leading-none">/</span>
					<span className="text-[10px] leading-none">{sourceLabel}</span>
				</span>
			)}
		</Button>
	);
}
