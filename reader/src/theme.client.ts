let preference: string | null = "system";
let resolvedTheme: "light" | "dark" = "light";
const subscribers = new Set<() => void>();

function applyTheme(theme: "light" | "dark") {
	document.documentElement.classList.remove("light", "dark");
	document.documentElement.classList.add(theme);
	document.documentElement.style.colorScheme = theme;
	if (resolvedTheme === theme) return;
	resolvedTheme = theme;
	for (const changed of subscribers) changed();
}

export function getReaderTheme() {
	return resolvedTheme;
}

export function subscribeReaderTheme(changed: () => void) {
	subscribers.add(changed);
	return () => {
		subscribers.delete(changed);
	};
}

export function setReaderTheme(theme: "light" | "dark") {
	preference = theme;
	try {
		localStorage.setItem("theme", theme);
	} catch {
		/* 保存不可でも現在の表示を切り替える。 */
	}
	applyTheme(theme);
}

export function initializeReaderTheme() {
	try {
		preference = localStorage.getItem("theme");
	} catch {
		preference = "system";
	}
	const media = matchMedia("(prefers-color-scheme: dark)");
	const update = () =>
		applyTheme(
			preference === "light" || preference === "dark"
				? preference
				: media.matches
					? "dark"
					: "light",
		);
	update();
	media.addEventListener("change", update);
	window.addEventListener("storage", (event) => {
		if (event.key !== null && event.key !== "theme") return;
		preference = event.newValue;
		update();
	});
}
