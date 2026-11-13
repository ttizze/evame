const failures: unknown[] = [];
const rememberError = (event: ErrorEvent) => {
	failures.push(event.error ?? event.message);
};
const rememberRejection = (event: PromiseRejectionEvent) => {
	failures.push(event.reason);
};
window.addEventListener("error", rememberError);
window.addEventListener("unhandledrejection", rememberRejection);

async function loadMonitoring() {
	try {
		const { captureException } = await import("@/instrument.client");
		for (const failure of failures) captureException(failure);
	} catch {
		// 監視SDKの取得失敗で閲覧や操作を止めない。
	} finally {
		window.removeEventListener("error", rememberError);
		window.removeEventListener("unhandledrejection", rememberRejection);
		failures.length = 0;
	}
}

if (
	performance
		.getEntriesByType("paint")
		.some((entry) => entry.name === "first-contentful-paint")
) {
	void loadMonitoring();
} else if (
	typeof PerformanceObserver !== "undefined" &&
	PerformanceObserver.supportedEntryTypes.includes("paint")
) {
	const observer = new PerformanceObserver((entries) => {
		if (
			!entries
				.getEntries()
				.some((entry) => entry.name === "first-contentful-paint")
		)
			return;
		observer.disconnect();
		void loadMonitoring();
	});
	observer.observe({ type: "paint", buffered: true });
} else {
	requestAnimationFrame(() =>
		requestAnimationFrame(() => void loadMonitoring()),
	);
}

export {};
