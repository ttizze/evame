import { parseAsStringEnum } from "nuqs";

const DISPLAY_MODES = ["user", "source", "both"] as const;
export type DisplayMode = (typeof DISPLAY_MODES)[number];

export const getNextDisplayMode = (mode: DisplayMode): DisplayMode =>
	mode === "user" ? "source" : mode === "source" ? "both" : "user";

export const getDisplayModeQueryState = () =>
	parseAsStringEnum<DisplayMode>([...DISPLAY_MODES]).withOptions({
		shallow: true,
		clearOnDefault: false,
	});

const DISPLAY_MODE_COOKIE = "displayMode";

export const getDisplayModeFromCookie = async (): Promise<
	DisplayMode | undefined
> => {
	if (typeof window === "undefined" || !("cookieStore" in window)) return;
	const value = await window.cookieStore.get(DISPLAY_MODE_COOKIE);
	if (!value) return;
	return DISPLAY_MODES.includes(value.value as DisplayMode)
		? (value.value as DisplayMode)
		: undefined;
};

export const setDisplayModeCookie = (mode: DisplayMode) => {
	if (typeof window === "undefined" || !("cookieStore" in window)) return;
	window.cookieStore
		.set({
			name: DISPLAY_MODE_COOKIE,
			value: mode,
			path: "/",
			expires: Date.now() + 1000 * 60 * 60 * 24 * 365,
			sameSite: "lax",
		})
		.catch(() => {});
};
