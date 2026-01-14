"use client";

import { useQueryState } from "nuqs";
import { type ReactNode, useEffect, useState } from "react";
import type { DisplayMode } from "@/app/[locale]/(common-layout)/_utils/display-mode";
import {
	getDisplayModeFromCookie,
	getDisplayModeQueryState,
	setDisplayModeCookie,
} from "@/app/[locale]/(common-layout)/_utils/display-mode";

export function DisplayModeRoot({ children }: { children: ReactNode }) {
	const [queryMode, setQueryMode] = useQueryState(
		"displayMode",
		getDisplayModeQueryState(),
	);
	const [mode, setMode] = useState<DisplayMode>("both");
	useEffect(() => {
		let active = true;

		const syncMode = async () => {
			if (queryMode) {
				if (!active) return;
				setMode(queryMode);
				setDisplayModeCookie(queryMode);
				return;
			}

			const cookieMode = await getDisplayModeFromCookie();
			if (!active) return;
			const nextMode = cookieMode ?? "both";
			if (cookieMode) {
				setQueryMode(cookieMode);
			}
			setMode(nextMode);
			setDisplayModeCookie(nextMode);
		};

		syncMode();

		return () => {
			active = false;
		};
	}, [queryMode, setQueryMode]);

	return (
		<div className="contents" data-display-mode={mode}>
			{children}
		</div>
	);
}
