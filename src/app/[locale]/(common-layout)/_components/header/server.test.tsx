import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Header } from "./server";

describe("ヘッダーのSSR境界", () => {
	it("SSRでもorigin相当のshell・logo・controlsを表示する", () => {
		const html = renderToString(<Header locale="ja" />);

		expect(html).toContain("<header");
		expect(html).toContain('href="/ja"');
		expect(html).toContain('aria-label="Evame Logo"');
		expect(html).toContain("h-6 w-[150px]");
		expect(html).toContain("h-6 w-20");
	});
});
