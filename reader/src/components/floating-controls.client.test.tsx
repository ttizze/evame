import { afterEach, expect, it, vi } from "vitest";
import "./floating-controls.client";

afterEach(() => {
	document.body.replaceChildren();
	vi.useRealTimers();
});

it("下スクロールで隠れ、上スクロールと画面上端で再び現れる", async () => {
	document.body.innerHTML =
		"<evame-floating-controls><div>操作</div></evame-floating-controls>";
	const controls = document.querySelector("evame-floating-controls")!;
	const scroll = async (y: number) => {
		Object.defineProperty(window, "scrollY", { configurable: true, value: y });
		window.dispatchEvent(new Event("scroll"));
		await vi.waitFor(() =>
			expect(controls.hasAttribute("data-hidden")).toBe(y === 200),
		);
	};
	await scroll(200);
	await scroll(180);
	await scroll(1);
});

it("表示切り替え直後のスクロールでちらつかず、取り外した後は反応しない", async () => {
	vi.useFakeTimers();
	Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
	document.body.innerHTML =
		"<evame-floating-controls><button>表示</button></evame-floating-controls>";
	const controls = document.querySelector("evame-floating-controls")!;
	document.querySelector("button")!.click();
	Object.defineProperty(window, "scrollY", { configurable: true, value: 200 });
	window.dispatchEvent(new Event("scroll"));
	await vi.advanceTimersByTimeAsync(30);
	expect(controls.hasAttribute("data-hidden")).toBe(false);
	await vi.advanceTimersByTimeAsync(100);
	window.dispatchEvent(new Event("scroll"));
	await vi.advanceTimersByTimeAsync(30);
	expect(controls.hasAttribute("data-hidden")).toBe(true);
	controls.remove();
	Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
	window.dispatchEvent(new Event("scroll"));
	await vi.advanceTimersByTimeAsync(30);
	expect(controls.hasAttribute("data-hidden")).toBe(true);
});
