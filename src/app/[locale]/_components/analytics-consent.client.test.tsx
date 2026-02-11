import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	AnalyticsConsent,
	analyticsConsentStorageKey,
} from "./analytics-consent.client";

vi.mock("@next/third-parties/google", () => ({
	GoogleAnalytics: ({ gaId }: { gaId: string }) => (
		<div data-ga-id={gaId} data-testid="google-analytics-script" />
	),
}));

const message = {
	title: "Analytics cookies",
	description: "Allow analytics to improve Evame.",
	accept: "Accept analytics",
	decline: "Decline analytics",
	privacyLink: "Read privacy policy",
};

describe("AnalyticsConsent", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it("同意未選択ならバナーを表示し、GAタグを読み込まない", async () => {
		render(
			<AnalyticsConsent
				gaTrackingId="G-TEST123"
				locale="en"
				message={message}
			/>,
		);

		expect(await screen.findByText(message.title)).toBeInTheDocument();
		expect(
			screen.queryByTestId("google-analytics-script"),
		).not.toBeInTheDocument();
	});

	it("GA ID が未設定でも同意未選択ならバナーを表示する", async () => {
		render(<AnalyticsConsent gaTrackingId="" locale="en" message={message} />);

		expect(await screen.findByText(message.title)).toBeInTheDocument();
		expect(
			screen.queryByTestId("google-analytics-script"),
		).not.toBeInTheDocument();
	});

	it("同意済みならGAタグを読み込む", async () => {
		window.localStorage.setItem(analyticsConsentStorageKey, "accepted");

		render(
			<AnalyticsConsent
				gaTrackingId="G-TEST123"
				locale="en"
				message={message}
			/>,
		);

		await waitFor(() => {
			expect(screen.getByTestId("google-analytics-script")).toBeInTheDocument();
		});
		expect(screen.queryByText(message.title)).not.toBeInTheDocument();
	});

	it("拒否済みならバナーとGAタグを表示しない", async () => {
		window.localStorage.setItem(analyticsConsentStorageKey, "rejected");

		render(
			<AnalyticsConsent
				gaTrackingId="G-TEST123"
				locale="en"
				message={message}
			/>,
		);

		await waitFor(() => {
			expect(screen.queryByText(message.title)).not.toBeInTheDocument();
		});
		expect(
			screen.queryByTestId("google-analytics-script"),
		).not.toBeInTheDocument();
	});

	it("同意するを押すと保存してGAタグを読み込む", async () => {
		const user = userEvent.setup();
		render(
			<AnalyticsConsent
				gaTrackingId="G-TEST123"
				locale="en"
				message={message}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: message.accept }),
		);

		expect(window.localStorage.getItem(analyticsConsentStorageKey)).toBe(
			"accepted",
		);
		await waitFor(() => {
			expect(screen.getByTestId("google-analytics-script")).toBeInTheDocument();
		});
		expect(screen.queryByText(message.title)).not.toBeInTheDocument();
	});

	it("同意しないを押すと拒否を保存してGAタグを読み込まない", async () => {
		const user = userEvent.setup();
		render(
			<AnalyticsConsent
				gaTrackingId="G-TEST123"
				locale="en"
				message={message}
			/>,
		);

		await user.click(
			await screen.findByRole("button", { name: message.decline }),
		);

		expect(window.localStorage.getItem(analyticsConsentStorageKey)).toBe(
			"rejected",
		);
		expect(
			screen.queryByTestId("google-analytics-script"),
		).not.toBeInTheDocument();
		expect(screen.queryByText(message.title)).not.toBeInTheDocument();
	});
});
