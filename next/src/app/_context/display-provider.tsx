"use client";

import { parseAsStringEnum, useQueryState } from "nuqs";
import { createContext, useContext, useEffect, useState } from "react";

export type DisplayMode = "source-only" | "translation-only" | "bilingual";
type Pref = "auto" | "source" | "translation" | "bilingual";

function decideFromLocales(u: string, s: string): DisplayMode {
	return u === s ? "source-only" : "translation-only";
}

const Ctx = createContext<{ mode: DisplayMode; cycle(): void } | null>(null);

export function DisplayProvider({
	children,
	userLocale,
	sourceLocale,
	initialPref = "auto",
}: {
	children: React.ReactNode;
	userLocale: string;
	sourceLocale: string;
	initialPref?: Pref;
}) {
	/* 1) Cookie */
	const [pref, setPref] = useState<Pref>(initialPref);
	useEffect(() => {
		const saved = document.cookie.match(/displayPref=(\w+)/)?.[1] as Pref;
		if (saved) setPref(saved);
	}, []);

	/* 2) URL */
	const [queryMode, setQueryMode] = useQueryState(
		"displayMode",
		parseAsStringEnum<DisplayMode>([
			"source-only",
			"translation-only",
			"bilingual",
		]).withOptions({ shallow: true }),
	);

	/* 3) 決定 */
	const fallbackMode = decideFromLocales(userLocale, sourceLocale);
	const mode: DisplayMode =
		queryMode ??
		(pref === "source"
			? "source-only"
			: pref === "translation"
				? "translation-only"
				: pref === "bilingual"
					? "bilingual"
					: fallbackMode); // auto
	/* 4) トグル */
	const cycle = () => {
		const next: DisplayMode =
			mode === "source-only"
				? "translation-only"
				: mode === "translation-only"
					? "bilingual"
					: "source-only";

		setQueryMode(next);

		const prefNext: Pref =
			next === "source-only"
				? "source"
				: next === "translation-only"
					? "translation"
					: "bilingual";
		setPref(prefNext);
		document.cookie = `displayPref=${prefNext};path=/;max-age=31536000`;
	};

	return <Ctx.Provider value={{ mode, cycle }}>{children}</Ctx.Provider>;
}

export const useDisplay = () => {
	const c = useContext(Ctx);
	if (!c) throw new Error("useDisplay must be inside DisplayProvider");
	return c;
};
