import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import "./toc.client";

const position = vi.hoisted(() => ({ compute: vi.fn(), stop: vi.fn() }));
vi.mock("@floating-ui/dom", () => ({
	computePosition: position.compute,
	autoUpdate: (_reference: Element, _popup: Element, update: () => void) => {
		update();
		return position.stop;
	},
	offset: vi.fn(),
	shift: vi.fn(),
	limitShift: vi.fn(),
	flip: vi.fn(),
}));
beforeEach(() => {
	position.compute.mockResolvedValue({
		x: 100,
		y: 80,
		placement: "bottom-end",
	});
});
afterEach(() => {
	document.body.replaceChildren();
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

function showToc() {
	document.body.innerHTML =
		'<evame-toc><span data-reader-toc-anchor><button data-state="closed" aria-expanded="false">目次</button></span><template><div data-reader-toc-positioner><div role="dialog" tabindex="-1" data-state="open" style="animation:none"><nav><a href="#first">最初の見出し</a><details><summary>親見出し</summary><a href="#child">子見出し</a></details></nav></div></div></template></evame-toc><button id="outside">本文の外</button>';
}

it.each(["none", "0s ease 0s 1 normal none running none"])(
	"アニメーション指定が%sでも、初回クリックで配信済みの目次を開き、追加通信をせず折りたたみへフォーカスする",
	async (animation) => {
		const request = vi.fn();
		vi.stubGlobal("fetch", request);
		showToc();
		document
			.querySelector("template")!
			.content.querySelector<HTMLElement>('[role="dialog"]')!.style.animation =
			animation;
		document.querySelector<HTMLButtonElement>("evame-toc button")!.click();
		expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
		expect(document.querySelector("evame-toc button")).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		await vi.waitFor(() =>
			expect(document.querySelector("summary")).toHaveFocus(),
		);
		expect(request).not.toHaveBeenCalled();
		expect(
			document
				.querySelector("[data-reader-toc-positioner]")
				?.getAttribute("style"),
		).toContain("translate(100px, 80px)");
	},
);

it("Escapeで閉じてトリガーへ戻り、外を押した場合はフォーカスを奪わない", async () => {
	showToc();
	const trigger =
		document.querySelector<HTMLButtonElement>("evame-toc button")!;
	trigger.click();
	await vi.waitFor(() =>
		expect(document.querySelector("summary")).toHaveFocus(),
	);
	document.dispatchEvent(
		new KeyboardEvent("keydown", {
			key: "Escape",
			bubbles: true,
			cancelable: true,
		}),
	);
	expect(document.querySelector('[role="dialog"]')).toBeNull();
	expect(trigger).toHaveFocus();
	expect(position.stop).toHaveBeenCalledTimes(1);
	trigger.click();
	await vi.waitFor(() =>
		expect(document.querySelector("summary")).toHaveFocus(),
	);
	const outside = document.querySelector<HTMLButtonElement>("#outside")!;
	outside.focus();
	outside.dispatchEvent(
		new MouseEvent("pointerdown", { button: 0, bubbles: true }),
	);
	expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
	outside.click();
	expect(document.querySelector('[role="dialog"]')).toBeNull();
	expect(outside).toHaveFocus();
});

it("親の折りたたみは既存HTMLのdetailsで開閉でき、取り外し時は位置の監視を止める", async () => {
	showToc();
	document.querySelector<HTMLButtonElement>("evame-toc button")!.click();
	const details = document.querySelector("details")!;
	expect(details.open).toBe(false);
	details.querySelector("summary")!.click();
	expect(details.open).toBe(true);
	document.querySelector("evame-toc")!.remove();
	expect(document.querySelector('[role="dialog"]')).toBeNull();
	expect(position.stop).toHaveBeenCalledTimes(1);
});

it("折りたたみがない目次は従来どおりパネルへフォーカスし、外へフォーカスを移しても閉じない", async () => {
	showToc();
	document
		.querySelector("template")!
		.content.querySelector("details")!
		.remove();
	document.querySelector<HTMLButtonElement>("evame-toc button")!.click();
	await vi.waitFor(() =>
		expect(document.querySelector('[role="dialog"]')).toHaveFocus(),
	);
	document.querySelector<HTMLButtonElement>("#outside")!.focus();
	expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
});

it("閉じるアニメーションの途中で開き直しても目次が消えず、監視を重複登録しない", async () => {
	showToc();
	const trigger =
		document.querySelector<HTMLButtonElement>("evame-toc button")!;
	trigger.click();
	await vi.waitFor(() =>
		expect(document.querySelector("summary")).toHaveFocus(),
	);
	const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
	let finish!: () => void;
	const finished = new Promise<void>((resolve) => {
		finish = resolve;
	});
	Object.defineProperty(panel, "getAnimations", {
		value: vi.fn(() => [{ finished, playState: "finished" }]),
		writable: true,
	});
	trigger.click();
	expect(panel).toHaveAttribute("data-state", "closed");
	trigger.click();
	finish();
	await finished;
	await Promise.resolve();
	expect(panel).toBeInTheDocument();
	expect(panel).toHaveAttribute("data-state", "open");
	expect(position.stop).not.toHaveBeenCalled();
	panel.getAnimations = () => [];
	trigger.click();
	expect(panel).not.toBeInTheDocument();
	expect(position.stop).toHaveBeenCalledTimes(1);
});

it("開いた要素を取り外して再配置しても閉じた状態から再び開ける", async () => {
	showToc();
	const root = document.querySelector("evame-toc")!;
	const trigger = root.querySelector("button")!;
	trigger.click();
	root.remove();
	document.body.append(root);
	expect(trigger).toHaveAttribute("aria-expanded", "false");
	trigger.click();
	await vi.waitFor(() =>
		expect(document.querySelector("summary")).toHaveFocus(),
	);
	expect(position.compute).toHaveBeenCalledTimes(2);
});
