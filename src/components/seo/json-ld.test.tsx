import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ArticleJsonLd, BreadcrumbJsonLd } from "./json-ld";

describe("scriptureの構造化データ", () => {
	test("ArticleとBreadcrumbListをJSON-LDとして出力する", () => {
		render(
			<>
				<ArticleJsonLd
					authorName="tipitaka"
					description="A source passage"
					headline="Dhammapada"
					inLanguage="pi"
					url="https://example.test/en/tipitaka/dhammapada"
				/>
				<BreadcrumbJsonLd
					items={[
						{ name: "Home", url: "https://example.test/en" },
						{
							name: "Dhammapada",
							url: "https://example.test/en/tipitaka/dhammapada",
						},
					]}
				/>
			</>,
		);

		const jsonLd = document.querySelectorAll(
			'script[type="application/ld+json"]',
		);
		expect(jsonLd).toHaveLength(2);
		expect(jsonLd[0]?.textContent).toContain('"@type":"Article"');
		expect(jsonLd[1]?.textContent).toContain('"@type":"BreadcrumbList"');
	});
});
