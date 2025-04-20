"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type ViewPref = "auto" | "source" | "translation" | "bilingual";
type Ctx = { pref: ViewPref; setPref(p: ViewPref): void };

const PrefCtx = createContext<Ctx | null>(null);

export function UserPrefProvider({ children }: { children: React.ReactNode }) {
	const [pref, setS] = useState<ViewPref>("auto");

	/* ① Cookie → state */
	useEffect(() => {
		const m = document.cookie.match(/display_mode=(\w+)/)?.[1] as ViewPref;
		if (m) setS(m);
	}, []);

	/* ② state → Cookie */
	const setPref = (p: ViewPref) => {
		setS(p);
		document.cookie = `display_mode=${p}; path=/; max-age=31536000`;
	};

	return (
		<PrefCtx.Provider value={{ pref, setPref }}>{children}</PrefCtx.Provider>
	);
}
export const useUserPref = () => {
	const c = useContext(PrefCtx);
	if (!c) throw new Error("useUserPref must be inside UserPrefProvider");
	return c;
};
