/* app/_context/display-provider.client.tsx */
"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
export type DisplayMode = "user" | "source" | "both";

export const getNextDisplayMode = (mode: DisplayMode): DisplayMode =>
	mode === "user" ? "source" : mode === "source" ? "both" : "user";

type CtxShape = {
	mode: DisplayMode;
	cycle(): void;
};

const Ctx = createContext<CtxShape | null>(null);

/* ---------------- Provider ---------------- */
export function DisplayProvider({
	children,
	initialMode = "both",
}: {
	children: ReactNode;
	initialMode?: DisplayMode;
}) {
	/* 1) 表示モード */
	const [mode, setMode] = useState<DisplayMode>(initialMode);

	/* 2) トグル */
	const cycle = () => {
		setMode((prev) => getNextDisplayMode(prev));
	};

	return (
		<Ctx.Provider value={{ mode, cycle }}>
			{/* display: contents でレイアウトへの影響を避けつつ、状態は data 属性で伝える */}
			{/* data-display-mode はグローバルCSSが参照して表示切替を行う */}
			<div className="contents" data-display-mode={mode}>
				{children}
			</div>
		</Ctx.Provider>
	);
}
/* ---------------- Hook ---------------- */
export const useDisplay = () => {
	const c = useContext(Ctx);
	if (!c) throw new Error("useDisplay must be inside DisplayProvider");
	return c;
};
