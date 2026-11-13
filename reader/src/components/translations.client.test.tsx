import { afterEach, expect, it, vi } from "vitest";
import "./translations.client";

const renderer = vi.hoisted(() => ({
	loads: 0,
	mount: vi.fn(),
	unmount: vi.fn(),
}));
vi.mock("./translations", () => {
	renderer.loads++;
	return { mountTranslation: renderer.mount };
});
afterEach(() => {
	document.body.replaceChildren();
	vi.clearAllMocks();
});

it("翻訳段落の操作までReactを読み込まず、最初のクリックと開閉を引き継ぐ", async () => {
	renderer.mount.mockReturnValue({ unmount: renderer.unmount });
	document.body.innerHTML =
		'<evame-translations data-locale="ja" data-search=""></evame-translations><span class="seg-tr"><span data-segment-id="7">翻訳</span></span>';
	expect(renderer.loads).toBe(0);
	document.querySelector<HTMLElement>("[data-segment-id]")!.click();
	await vi.waitFor(() => expect(renderer.mount).toHaveBeenCalledTimes(1));
	expect(renderer.mount.mock.calls[0].slice(1)).toEqual([7, "ja", ""]);
	document.querySelector<HTMLElement>("[data-segment-id]")!.click();
	expect(renderer.unmount).toHaveBeenCalledTimes(1);
});

it("読み込み中に閉じた段落へフォームを表示しない", async () => {
	document.body.innerHTML =
		'<evame-translations data-locale="ja" data-search=""></evame-translations><span class="seg-tr"><span data-segment-id="7">翻訳</span></span>';
	const target = document.querySelector<HTMLElement>("[data-segment-id]")!;
	target.click();
	target.click();
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(renderer.mount).not.toHaveBeenCalled();
});
