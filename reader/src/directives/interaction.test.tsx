import { afterEach, expect, it, vi } from "vitest";
import interaction from "./interaction";

afterEach(() => document.body.replaceChildren());

it.each(["Enter", " "])(
	"最初の%sキーでクリック操作を一度だけ引き継ぐ",
	async (key) => {
		document.body.innerHTML = "<section><button>開く</button></section>";
		const root = document.querySelector("section")!;
		const button = document.querySelector("button")!;
		const clicked = vi.fn();
		interaction(
			async () => async () => {
				button.addEventListener("click", clicked);
			},
			{ name: "interaction", value: "" },
			root,
		);
		button.dispatchEvent(
			new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
		);
		await vi.waitFor(() => expect(clicked).toHaveBeenCalledTimes(1));
	},
);

it("表示しただけでは読み込まず、最初のクリックを起動後に一度だけ実行する", async () => {
	document.body.innerHTML = "<section><button>開く</button></section>";
	const root = document.querySelector("section")!;
	const button = document.querySelector("button")!;
	const click = vi.fn();
	const hydrate = vi.fn(async () => {
		button.addEventListener("click", click);
	});
	const load = vi.fn(async () => hydrate);
	interaction(load, { name: "interaction", value: "" }, root);
	expect(load).not.toHaveBeenCalled();
	button.click();
	await vi.waitFor(() => expect(click).toHaveBeenCalledTimes(1));
	expect(hydrate).toHaveBeenCalledTimes(1);
	button.click();
	expect(click).toHaveBeenCalledTimes(2);
});

it("リンクと新規ページ作成はReactを待たず、そのまま操作できる", () => {
	document.body.innerHTML =
		'<section><a href="#search">検索</a><button data-create-page="alice">新規</button></section>';
	const load = vi.fn();
	interaction(
		load,
		{ name: "interaction", value: "" },
		document.querySelector("section")!,
	);
	document.querySelector("a")!.click();
	document.querySelector("button")!.click();
	expect(load).not.toHaveBeenCalled();
});

it("フォーカスで操作の準備を始め、矢印キーも起動後に引き継ぐ", async () => {
	document.body.innerHTML = "<section><button>言語</button></section>";
	const root = document.querySelector("section")!;
	const button = document.querySelector("button")!;
	const keys = vi.fn();
	let finish!: () => void;
	const ready = new Promise<void>((resolve) => {
		finish = resolve;
	});
	const hydrate = vi.fn(async () => {
		await ready;
		button.addEventListener("keydown", keys);
	});
	interaction(async () => hydrate, { name: "interaction", value: "" }, root);
	button.focus();
	button.dispatchEvent(
		new KeyboardEvent("keydown", {
			key: "ArrowDown",
			bubbles: true,
			cancelable: true,
		}),
	);
	finish();
	await vi.waitFor(() => expect(keys).toHaveBeenCalledTimes(1));
	expect(keys.mock.calls[0][0].key).toBe("ArrowDown");
});

it("読み込み中に画面から外れた部品は起動しない", async () => {
	document.body.innerHTML = "<section><button>開く</button></section>";
	const root = document.querySelector("section")!;
	const hydrate = vi.fn();
	let finish!: (value: () => Promise<void>) => void;
	const loading = new Promise<() => Promise<void>>((resolve) => {
		finish = resolve;
	});
	interaction(() => loading, { name: "interaction", value: "" }, root);
	document.querySelector("button")!.click();
	root.remove();
	finish(hydrate);
	await vi.waitFor(() => expect(root.hasAttribute("aria-busy")).toBe(false));
	expect(hydrate).not.toHaveBeenCalled();
});
