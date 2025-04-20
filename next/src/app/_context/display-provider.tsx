/* app/_context/display-provider.client.tsx */
"use client";

import { parseAsStringEnum, useQueryState } from "nuqs";
import { createContext, useContext, useEffect, useState } from "react";
import type { DisplayMode, Pref } from "./display-types";
export function decideFromLocales(user: string, source: string): DisplayMode {
	return user === source ? "source" : "user";
}

/* ---------------- Context ---------------- */
const Ctx = createContext<{ mode: DisplayMode; cycle(): void } | null>(null);

/* ---------------- Provider ---------------- */
export function DisplayProvider({
	children,
	userLocale,
	sourceLocale,
	initialPref = "auto",
}: {
	children: React.ReactNode;
	userLocale: string;
	sourceLocale: string; // "mixed" なら自動判定しない
	initialPref?: Pref; // SSR で cookies().get(...)
}) {
	/* 1) Cookie → pref */
	const [pref, setPref] = useState<Pref>(initialPref);
	useEffect(() => {
		const saved =
			(document.cookie.match(/displayPref=(\w+)/)?.[1] as Pref) ?? "auto";
		setPref(saved);
	}, []);

	/* 2) URL → queryMode */
	const [queryMode, setQueryMode] = useQueryState(
		"displayMode",
		parseAsStringEnum<DisplayMode>(["user", "source", "both"]).withOptions({
			shallow: true,
		}),
	);

	/* 3) 最終モード決定 */
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

	/* 3‑b) URL と Cookie を常に同期 */
	useEffect(() => {
		if (queryMode === mode) return; // 既に一致
		if (pref === "auto" && mode === fallback) {
			setQueryMode(null); // デフォルトなら URL をクリーンに
		} else {
			setQueryMode(mode); // 追加 / 更新
		}
	}, [queryMode, mode, pref, fallback, setQueryMode]);

	/* 4) トグル  ─3 段ループ */
	const cycle = () => {
		const next =
			mode === "user" ? "source" : mode === "source" ? "both" : "user";

		setQueryMode(next); // URL 更新
		const nextPref: Pref = next; // user | source | both
		document.cookie = `displayPref=${nextPref};path=/;max-age=31536000`;
	};

	return <Ctx.Provider value={{ mode, cycle }}>{children}</Ctx.Provider>;
}

/* ---------------- Hook ---------------- */
export const useDisplay = () => {
	const c = useContext(Ctx);
	if (!c) throw new Error("useDisplay must be inside DisplayProvider");
	return c;
};
