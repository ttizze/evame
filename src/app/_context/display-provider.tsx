/* app/_context/display-provider.client.tsx */
"use client";

import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

const DISPLAY_MODES = ["user", "source", "both"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

const DISPLAY_MODE_COOKIE = "displayMode";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const toDisplayMode = (value?: string | null): DisplayMode | undefined => {
	if (!value) return;
	return DISPLAY_MODES.includes(value as DisplayMode)
		? (value as DisplayMode)
		: undefined;
};

const getDisplayModeFromQuery = (): DisplayMode | undefined => {
	if (typeof window === "undefined") return;
	return toDisplayMode(
		new URLSearchParams(window.location.search).get(DISPLAY_MODE_COOKIE),
	);
};

const getDisplayModeFromCookie = async (): Promise<DisplayMode | undefined> => {
	if (typeof window === "undefined") return;
	if (!("cookieStore" in window)) return;
	const value = await window.cookieStore.get(DISPLAY_MODE_COOKIE);
	return toDisplayMode(value?.value);
};

const setDisplayModeCookie = (mode: DisplayMode) => {
	if (typeof window === "undefined") return;
	if (!("cookieStore" in window)) return;
	window.cookieStore
		.set({
			name: DISPLAY_MODE_COOKIE,
			value: mode,
			path: "/",
			expires: Date.now() + 1000 * COOKIE_MAX_AGE_SECONDS,
			sameSite: "lax",
		})
		.catch(() => {});
};

export const getNextDisplayMode = (mode: DisplayMode): DisplayMode =>
	mode === "user" ? "source" : mode === "source" ? "both" : "user";

type CtxShape = {
	mode: DisplayMode;
	cycle(): void;
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
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		let active = true;

		const syncMode = async () => {
			const queryMode = getDisplayModeFromQuery();
			if (!active) return;
			if (queryMode) {
				setMode(queryMode);
				setIsReady(true);
				setDisplayModeCookie(queryMode);
				return;
			}

			const cookieMode = await getDisplayModeFromCookie();
			if (!active) return;
			if (cookieMode) {
				setMode(cookieMode);
				setIsReady(true);
				return;
			}

			setMode(initialMode);
			setIsReady(true);
		};

		syncMode();

		return () => {
			active = false;
		};
	}, [initialMode]);

	useEffect(() => {
		if (!isReady) return;
		setDisplayModeCookie(mode);
	}, [mode, isReady]);

	const cycle = () => {
		setMode((prev) => getNextDisplayMode(prev));
	};

	return (
		<Ctx.Provider value={{ mode, cycle }}>
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
