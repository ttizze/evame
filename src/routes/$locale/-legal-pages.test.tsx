import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AboutPage from "@/app/[locale]/(common-layout)/about/page";
import PrivacyPolicyPage from "@/app/[locale]/privacy/page";
import TermsPage from "@/app/[locale]/terms/page";
import { Route as AboutRoute } from "./about";
import { Route as PrivacyRoute } from "./privacy";
import { Route as TermsRoute } from "./terms";

function routeHead(route: unknown): (context: unknown) => unknown {
	const head = (route as { options: { head?: (context: unknown) => unknown } })
		.options.head;
	if (!head) throw new Error("法務ページrouteのheadが見つかりません");
	return head;
}

describe("locale付き法務ページ", () => {
	it("about routeをlocale付きで公開する", () => {
		const head = routeHead(AboutRoute)({ params: { locale: "en" } });

		expect(head).toMatchObject({
			meta: expect.arrayContaining([
				{ title: expect.stringContaining("About") },
				{ name: "robots", content: "index,follow" },
			]),
		});
	});

	it("privacyとterms routeをlocale付きで公開する", () => {
		expect(routeHead(PrivacyRoute)({ params: { locale: "ja" } })).toMatchObject(
			{
				meta: expect.arrayContaining([
					{ name: "robots", content: "index,follow" },
				]),
			},
		);
		expect(routeHead(TermsRoute)({ params: { locale: "ja" } })).toMatchObject({
			meta: expect.arrayContaining([
				{ name: "robots", content: "index,follow" },
			]),
		});
	});

	it("originの法務ページ本文を表示する", () => {
		const { unmount } = render(<AboutPage locale="en" />);
		expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
		unmount();

		const privacy = render(<PrivacyPolicyPage locale="en" />);
		expect(
			privacy.getByRole("heading", { name: "Privacy Policy" }),
		).toBeInTheDocument();
		privacy.unmount();

		const terms = render(<TermsPage locale="en" />);
		expect(
			terms.getByRole("heading", { name: "Terms of Service" }),
		).toBeInTheDocument();
	});
});
