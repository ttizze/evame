/* app/_context/display-provider.client.tsx */
"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

const DISPLAY_MODES = ["user", "source", "both"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const getNextDisplayMode = (mode: DisplayMode): DisplayMode =>
	mode === "user" ? "source" : mode === "source" ? "both" : "user";

type CtxShape = {
	mode: DisplayMode;
	cycle(): void;
	setMode(next: DisplayMode): void;
};

const Ctx = createContext<CtxShape | null>(null);

export function DisplayProvider({
	children,
	initialMode = "both",
}: {
	children: ReactNode;
	initialMode?: DisplayMode;
}) {
	const [mode, setMode] = useState<DisplayMode>(initialMode);

	const cycle = () => {
		setMode((prev) => getNextDisplayMode(prev));
	};

	return (
		<Ctx.Provider value={{ mode, cycle, setMode }}>
			<div className="contents" data-display-mode={mode}>
				{children}
			</div>
		</Ctx.Provider>
	);
}

export const useDisplay = () => {
	const c = useContext(Ctx);
	if (!c) throw new Error("useDisplay must be inside DisplayProvider");
	return c;
};
