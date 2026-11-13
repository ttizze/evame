import { afterEach, expect, it, vi } from "vitest";
import {
	getReaderTheme,
	initializeReaderTheme,
	setReaderTheme,
	subscribeReaderTheme,
} from "./theme.client";

afterEach(() => {
	document.documentElement.className = "";
	localStorage.clear();
	vi.unstubAllGlobals();
});

it("Reactを起動せずOSと別タブのテーマ変更へ追従し、本人の選択をOS変更で上書きしない", () => {
	let dark = false;
	const media = new EventTarget();
	Object.defineProperty(media, "matches", { get: () => dark });
	vi.stubGlobal("matchMedia", () => media);
	localStorage.setItem("theme", "system");
	initializeReaderTheme();
	expect(getReaderTheme()).toBe("light");
	const changed = vi.fn();
	const unsubscribe = subscribeReaderTheme(changed);
	dark = true;
	media.dispatchEvent(new Event("change"));
	expect(document.documentElement.classList.contains("dark")).toBe(true);
	expect(getReaderTheme()).toBe("dark");
	setReaderTheme("light");
	expect(getReaderTheme()).toBe("light");
	expect(localStorage.getItem("theme")).toBe("light");
	dark = false;
	media.dispatchEvent(new Event("change"));
	dark = true;
	media.dispatchEvent(new Event("change"));
	expect(getReaderTheme()).toBe("light");
	localStorage.setItem("theme", "dark");
	window.dispatchEvent(
		new StorageEvent("storage", { key: "theme", newValue: "dark" }),
	);
	expect(getReaderTheme()).toBe("dark");
	localStorage.removeItem("theme");
	window.dispatchEvent(
		new StorageEvent("storage", { key: "theme", newValue: null }),
	);
	dark = false;
	media.dispatchEvent(new Event("change"));
	expect(getReaderTheme()).toBe("light");
	expect(document.documentElement.style.colorScheme).toBe("light");
	unsubscribe();
	changed.mockClear();
	setReaderTheme("dark");
	expect(changed).not.toHaveBeenCalled();
});
