/* app/_context/display-provider.client.tsx */
"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

const VIEWS = ["user", "source", "both"] as const;
export type View = (typeof VIEWS)[number];

type CtxShape = {
	view: View;
	setView(next: View): void;
};

const Ctx = createContext<CtxShape | null>(null);

export function ViewProvider({
	children,
	initialView = "both",
}: {
	children: ReactNode;
	initialView?: View;
}) {
	const [view, setView] = useState<View>(initialView);

	return (
		<Ctx.Provider value={{ view, setView }}>
			<div className="contents" data-view={view}>
				{children}
			</div>
		</Ctx.Provider>
	);
}

export const useView = () => {
	const c = useContext(Ctx);
	if (!c) throw new Error("useView must be inside ViewProvider");
	return c;
};
