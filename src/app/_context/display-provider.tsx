/* app/_context/display-provider.client.tsx */
"use client";

import { parseAsStringEnum, useQueryState } from "nuqs";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import type { DisplayMode, Pref } from "./display-types";

function decideFromLocales(user: string, source: string): DisplayMode {
	return user === source ? "source" : "user";
}

type CtxShape = {
	mode: DisplayMode;
	cycle(): void;
	/** ページ側から現在の sourceLocale を通知 */
	setSourceLocale(locale: string): void;
};

const Ctx = createContext<CtxShape | null>(null);

/* ---------------- Provider ---------------- */
export function DisplayProvider({
	children,
	userLocale,
	/** 最初に訪れたページの sourceLocale を渡す (app/layout では "mixed") */
	initialSourceLocale = "mixed",
	initialPref = "auto",
}: {
	children: ReactNode;
	userLocale: string;
	initialSourceLocale?: string;
	initialPref?: Pref;
}) {
	/* 1) Cookie → pref */
	const [pref, setPref] = useState<Pref>(initialPref);
	useEffect(() => {
		const saved =
			(document.cookie.match(/displayPref=(\w+)/)?.[1] as Pref) ?? "auto";
		setPref(saved);
	}, []);

	/* 2) sourceLocale はページごとに書き換わる */
	const [sourceLocale, setSourceLocale] = useState(initialSourceLocale);

	/* 3) URL ↔︎ queryMode */
	const [queryMode, setQueryMode] = useQueryState(
		"displayMode",
		parseAsStringEnum<DisplayMode>(["user", "source", "both"]).withOptions({
			shallow: true,
		}),
	);

	/* 4) 現在の最終モード */
	const fallback = decideFromLocales(userLocale, sourceLocale);
	const mode: DisplayMode =
		queryMode ??
		(pref === "source"
			? "source"
			: pref === "user"
				? "user"
				: pref === "both"
					? "both"
					: fallback); // auto

	/* 5) URL と Cookie を同期 */
	useEffect(() => {
		if (queryMode === mode) return;
		if (pref === "auto" && mode === fallback) {
			setQueryMode(null); // URL をクリーンに
		} else {
			setQueryMode(mode);
		}
	}, [queryMode, mode, pref, fallback, setQueryMode]);

	/* 6) トグル */
	const cycle = useCallback(() => {
		const next =
			mode === "user" ? "source" : mode === "source" ? "both" : "user";
		setQueryMode(next);
		document.cookie = `displayPref=${next};path=/;max-age=31536000`;
		setPref(next as Pref);
	}, [mode, setQueryMode]);

	return (
		<Ctx.Provider value={{ mode, cycle, setSourceLocale }}>
			{children}
		</Ctx.Provider>
	);
}

/* ---------------- Hook ---------------- */
export const useDisplay = () => {
	const c = useContext(Ctx);
	if (!c) throw new Error("useDisplay must be inside DisplayProvider");
	return c;
};
