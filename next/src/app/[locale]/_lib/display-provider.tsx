/* app/_lib/display-provider.tsx */
"use client";
import { useUserPref } from "@/app/_providers/user-pref-provider";
import { useQueryState } from "nuqs";
import { parseAsStringEnum } from "nuqs/server";
import { createContext, useContext, useState } from "react";
import { type DisplayMode, decideFromLocales } from "./display-preference";

type Ctx = {
	mode: DisplayMode;
	cycleMode(): void; // ← これだけ公開
};
const Ctx = createContext<Ctx | null>(null);

export function DisplayProvider({
	children,
	userLocale,
	sourceLocale,
	forcedMode,
}: {
	children: React.ReactNode;
	userLocale: string;
	sourceLocale: string;
	forcedMode?: DisplayMode;
}) {
	/* (1) ベースモード */
	const { pref } = useUserPref();
	const base: DisplayMode =
		forcedMode ??
		(pref === "auto"
			? decideFromLocales(userLocale, sourceLocale)
			: pref === "source"
				? "source-only"
				: pref === "translation"
					? "translation-only"
					: "bilingual");

	const [urlMode, setUrlMode] = useQueryState(
		"displayMode",
		parseAsStringEnum<DisplayMode>([
			"source-only",
			"translation-only",
			"bilingual",
		])
			.withDefault(base)
			.withOptions({ shallow: true }),
	);
	const [mode, setMode] = useState<DisplayMode>(urlMode ?? base);

	// URL が後から来た場合も追従
	if (urlMode && urlMode !== mode) setMode(urlMode);

	/* (3) サイクル関数 */
	const cycleMode = () => {
		const next =
			mode === "source-only"
				? "translation-only"
				: mode === "translation-only"
					? "bilingual"
					: "source-only";
		setMode(next);
		setUrlMode(next);
	};

	return <Ctx.Provider value={{ mode, cycleMode }}>{children}</Ctx.Provider>;
}

export const useDisplay = () => {
	const c = useContext(Ctx);
	if (!c) throw new Error("useDisplay must be inside DisplayProvider");
	return c;
};
