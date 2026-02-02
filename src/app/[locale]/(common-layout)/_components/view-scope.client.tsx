"use client";

import { useQueryState } from "nuqs";
import type { ReactNode } from "react";
import { viewQueryState } from "@/app/[locale]/(common-layout)/_components/view-query";

interface ViewScopeProps {
	children: ReactNode;
}

export function ViewScope({ children }: ViewScopeProps) {
	const [view] = useQueryState("view", viewQueryState);

	return (
		<div className="contents" data-view={view}>
			{children}
		</div>
	);
}
