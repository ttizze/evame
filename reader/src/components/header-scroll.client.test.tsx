import "@testing-library/jest-dom/vitest";
import { afterEach, expect, it, vi } from "vitest";
import "./header-scroll.client";

const scroll = vi.hoisted(() => ({ apply: (_y: number) => {} }));
vi.mock(
	"@/app/[locale]/(common-layout)/_components/header/hooks/scroll-y-store",
	() => ({
		subscribeScrollY: (apply: (y: number) => void) => {
			scroll.apply = apply;
			return vi.fn();
		},
	}),
);
afterEach(() => document.body.replaceChildren());

it.each(["header", "div data-scroll-header"])(
	"%sも現在位置に従い固定・解除し、本文の幅と余白を保つ",
	(tag) => {
		document.body.innerHTML = `<evame-header-scroll><${tag}><div data-scroll-padding>日付と目次</div></${tag.split(" ")[0]}></evame-header-scroll>`;
		const root = document.body.firstElementChild!;
		let top = -100;
		vi.spyOn(root, "getBoundingClientRect").mockImplementation(
			() => ({ top }) as DOMRect,
		);
		const header = root.firstElementChild!;
		scroll.apply(500);
		scroll.apply(480);
		expect(header).toHaveClass("fixed");
		expect(header.querySelector("[data-scroll-padding]")).toHaveClass("px-4");
		top = 100;
		scroll.apply(460);
		expect(header).not.toHaveClass("fixed");
		expect(header.querySelector("[data-scroll-padding]")).not.toHaveClass(
			"px-4",
		);
		expect(root.lastElementChild).toHaveAttribute("hidden");
	},
);
