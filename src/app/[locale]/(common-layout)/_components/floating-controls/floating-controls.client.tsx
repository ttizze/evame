"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useScrollVisibility } from "./hooks/use-scroll-visibility";
import { ShareDialog } from "./share-dialog";
import { ViewCycle } from "./view-cycle.client";

type AnnotationType = {
	key: string;
	label: string;
};

function readAnnotations(): string[] {
	if (typeof window === "undefined") return [];
	return (new URLSearchParams(window.location.search).get("annotations") ?? "")
		.split("~")
		.filter(Boolean);
}

function replaceAnnotations(values: readonly string[]) {
	if (typeof window === "undefined") return;
	const url = new URL(window.location.href);
	if (values.length === 0) url.searchParams.delete("annotations");
	else url.searchParams.set("annotations", values.join("~"));
	window.history.replaceState(window.history.state, "", url);
}

export function FloatingControls({
	likeButton,
	position = "fixed bottom-4 left-1/2 -translate-x-1/2 duration-300",
	alwaysVisible = false,
	annotationTypes = [],
	userLocale,
	sourceLocale,
}: {
	likeButton?: ReactNode;
	position?: string;
	alwaysVisible?: boolean;
	annotationTypes?: AnnotationType[];
	userLocale: string;
	sourceLocale: string;
}) {
	const { isVisible, ignoreNextScroll } = useScrollVisibility(alwaysVisible);
	const [visibleAnnotations, setVisibleAnnotations] =
		useState<string[]>(readAnnotations);

	useEffect(() => {
		const tokens = visibleAnnotations.filter(Boolean);
		if (tokens.length === 0)
			delete document.documentElement.dataset.annotations;
		else document.documentElement.dataset.annotations = tokens.join(" ");
	}, [visibleAnnotations]);

	function toggleAnnotation(label: string) {
		const next = visibleAnnotations.includes(label)
			? visibleAnnotations.filter((value) => value !== label)
			: [...visibleAnnotations, label];
		setVisibleAnnotations(next);
		replaceAnnotations(next);
		ignoreNextScroll();
	}

	return (
		<div
			className={cn(
				`${position} z-50 w-auto rounded-full border bg-background/80 px-5 py-3 backdrop-blur-sm`,
				isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0",
			)}
		>
			<div className="flex justify-center gap-2 sm:gap-6">
				<ViewCycle
					afterClick={ignoreNextScroll}
					sourceLocale={sourceLocale}
					userLocale={userLocale}
				/>
				{annotationTypes.map((annotation) => {
					const active = visibleAnnotations.includes(annotation.label);
					return (
						<Button
							aria-pressed={active}
							className="h-10 rounded-full px-3 text-sm"
							key={annotation.key}
							onClick={() => toggleAnnotation(annotation.label)}
							title={`${active ? "Hide" : "Show"} ${annotation.label}`}
							variant={active ? "default" : "outline"}
						>
							{annotation.label}
						</Button>
					);
				})}
				{likeButton ? <div className="h-10 w-10">{likeButton}</div> : null}
				<ShareDialog />
			</div>
		</div>
	);
}
