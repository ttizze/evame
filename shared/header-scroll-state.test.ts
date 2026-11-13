import { expect, it } from "vitest";
import { headerScrollState } from "./header-scroll-state";

it.each([
	[0, 20, 0, true, false, { pinned: false, visible: true }],
	[100, 80, 10, true, false, { pinned: false, visible: true }],
	[100, 80, -100, true, true, { pinned: false, visible: false }],
	[80, 100, -100, false, false, { pinned: true, visible: true }],
	[100, 95, -100, true, true, { pinned: true, visible: true }],
	[95, 100, -100, false, false, { pinned: false, visible: false }],
] as const)(
	"現在位置と直前のスクロールから固定と表示を決める: %s, %s, %s",
	(current, previous, top, pinned, visible, result) => {
		expect(headerScrollState(current, previous, top, pinned, visible)).toEqual(
			result,
		);
	},
);
