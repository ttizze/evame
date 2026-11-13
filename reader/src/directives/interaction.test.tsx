import { afterEach, expect, it, vi } from "vitest";
import interaction from "./interaction";

afterEach(() => document.body.replaceChildren());

it("ダウンロードにマウスを重ねた最初の操作でもツールチップを起動する", async () => {
	document.body.innerHTML =
		'<section><a data-reader-tooltip href="#download">ダウンロード</a></section>';
	const root = document.querySelector("section")!;
	const moved = vi.fn();
	interaction(
		async () => async () => {
			document.querySelector("a")!.addEventListener("pointermove", moved);
		},
		{ name: "interaction", value: "" },
		root,
	);
	const link = document.querySelector("a")!;
	vi.spyOn(link, "matches").mockReturnValue(true);
	link.dispatchEvent(
		new PointerEvent("pointerover", {
			pointerType: "mouse",
			clientX: 10,
			clientY: 20,
			bubbles: true,
		}),
	);
	await vi.waitFor(() => expect(moved).toHaveBeenCalledTimes(1));
	expect(moved.mock.calls[0][0]).toMatchObject({
		pointerType: "mouse",
		clientX: 10,
		clientY: 20,
	});
});

it("起動時にボタンが置き換わっても最初の操作を新しいボタンへ渡す", async () => {
	document.body.innerHTML = "<section><button>目次</button></section>";
	const root = document.querySelector("section")!;
	const clicked = vi.fn();
	interaction(
		async () => async () => {
			const replacement = document.createElement("button");
			replacement.addEventListener("click", clicked);
			root.replaceChildren(replacement);
		},
		{ name: "interaction", value: "" },
		root,
	);
	document.querySelector("button")!.click();
	await vi.waitFor(() => expect(clicked).toHaveBeenCalledTimes(1));
});

it("Reactの初回コミットを待ってから最初のクリックを渡す", async () => {
	document.body.innerHTML =
		"<astro-island ssr><button>目次</button></astro-island>";
	const root = document.querySelector<HTMLElement>("astro-island")!;
	const button = document.querySelector("button")!;
	const clicked = vi.fn();
	interaction(
		async () => async () => {
			button.addEventListener("click", clicked);
		},
		{ name: "interaction", value: "" },
		root,
	);
	button.click();
	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(clicked).not.toHaveBeenCalled();
	root.dispatchEvent(new Event("reader:ready"));
	await vi.waitFor(() => expect(clicked).toHaveBeenCalledTimes(1));
});

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

it("リンク・新規ページ・いいねはReactを待たず、そのまま操作できる", async () => {
	document.body.innerHTML =
		'<section><a href="#search">検索</a><button data-create-page="alice">新規</button><button data-like-page="7">Like</button></section>';
	const load = vi.fn();
	interaction(
		load,
		{ name: "interaction", value: "" },
		document.querySelector("section")!,
	);
	document.querySelector("a")!.click();
	for (const button of document.querySelectorAll("button")) {
		button.dispatchEvent(new Event("pointerover", { bubbles: true }));
		button.focus();
		button.click();
	}
	await new Promise((resolve) => setTimeout(resolve, 0));
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
