import { render } from "@testing-library/react";
import { sanitizeAndParseText } from "./sanitize-and-parse-text.server";

describe("sanitizeAndParseText", () => {
	test("改行を <br> に変換して描画する", () => {
		const { container } = render(
			<div data-testid="root">{sanitizeAndParseText("a\nb")}</div>,
		);

		expect(container.querySelectorAll("br")).toHaveLength(1);
		expect(container).toHaveTextContent("ab");
	});

	test("危険なタグを除去して描画する", () => {
		const { container } = render(
			<div data-testid="root">
				{sanitizeAndParseText('<script>alert("x")</script>ok')}
			</div>,
		);

		expect(container.querySelector("script")).toBeNull();
		expect(container).toHaveTextContent("ok");
	});

	test("ブロックタグを unwrap して無効なネストを避ける", () => {
		const { container } = render(
			<div data-testid="root">
				{sanitizeAndParseText("<p>a</p><h2>b</h2>")}
			</div>,
		);

		expect(container.querySelector("p")).toBeNull();
		expect(container.querySelector("h2")).toBeNull();
		expect(container).toHaveTextContent("ab");
	});
});
