import { cleanup, render } from "@testing-library/react";
import tocbot from "tocbot";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import TableOfContents from "./toc";

// tocbotのモック
vi.mock("tocbot", () => {
  const init    = vi.fn();
  const destroy = vi.fn();

  return {
    __esModule: true,   // ESModule 互換にする
    init,
    destroy,
    default: { init, destroy }, // ← ここがポイント
  };
});

describe("TableOfContents", () => {
	const mockOnItemClick = vi.fn();

	beforeEach(() => {
		// DOMに必要な要素を追加
		document.body.innerHTML = `
      <div class="js-content">
        <h1 id="heading1">Heading 1</h1>
        <h2 id="heading2">Heading 2</h2>
        <h3 id="heading3">Heading 3</h3>
      </div>
    `;

		// タイマーのモック
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.resetAllMocks();
		vi.useRealTimers();
	});

	it("should render the TOC container", () => {
		render(<TableOfContents onItemClick={mockOnItemClick} />);
		const tocElement = document.querySelector(".js-toc");
		expect(tocElement).toBeTruthy();
	});

	it("should call onItemClick when TOC item is clicked", async () => {
		render(<TableOfContents onItemClick={mockOnItemClick} />);

		vi.advanceTimersByTime(300);

		// tocbot.initが呼ばれた時のonClickコールバックを取得
		const initCall = vi.mocked(tocbot.init).mock.calls[0][0];
		const onClickCallback = initCall?.onClick as
			| ((e: unknown) => void)
			| undefined;

		// onClickコールバックを手動で呼び出す
		if (onClickCallback) {
			onClickCallback({});
		}

		// onItemClickが呼ばれたことを確認
		expect(mockOnItemClick).toHaveBeenCalledTimes(1);
	});

	it("should clean up tocbot on unmount", () => {
		const { unmount } = render(
			<TableOfContents onItemClick={mockOnItemClick} />,
		);

		vi.advanceTimersByTime(300);

		// tocbot.initが呼ばれたことを確認
		expect(tocbot.init).toHaveBeenCalledTimes(1);

		// コンポーネントをアンマウント
		unmount();

		// tocbot.destroyが呼ばれたことを確認
		expect(tocbot.destroy).toHaveBeenCalledTimes(1);
	});

	it("should truncate long heading text", () => {
		render(<TableOfContents onItemClick={mockOnItemClick} />);

		vi.advanceTimersByTime(300);

		// tocbot.initが呼ばれた時のheadingLabelCallbackを取得
		const initCall = vi.mocked(tocbot.init).mock.calls[0][0];
		const headingLabelCallback = initCall?.headingLabelCallback as
			| ((text: string) => string)
			| undefined;

		if (headingLabelCallback) {
			// 短いテキストはそのまま
			expect(headingLabelCallback("Short text")).toBe("Short text");

			// 長いテキストは切り詰められる
			const longText =
				"This is a very long heading text that should be truncated";
			expect(headingLabelCallback(longText)).toBe(
				"This is a very long heading text that sh...",
			);
		} else {
			throw new Error("headingLabelCallback is undefined");
		}
	});
});
