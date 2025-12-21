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
});
