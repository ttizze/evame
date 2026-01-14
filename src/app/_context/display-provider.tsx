/* app/_context/display-provider.client.tsx */
"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

const DISPLAY_MODES = ["user", "source", "both"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

type CtxShape = {
	mode: DisplayMode;
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

	return (
		<Ctx.Provider value={{ mode, setMode }}>
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
