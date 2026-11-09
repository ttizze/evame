import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IntlProvider } from "use-intl";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { messages } from "@/i18n/messages";
import { ExportPagesButton } from "./export-pages-button";

const { failed, succeeded } = vi.hoisted(() => ({
	failed: vi.fn(),
	succeeded: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: failed, success: succeeded } }));
const fetchExport = vi.fn<typeof fetch>();
const createObjectURL = vi.fn(() => "blob:export");
const revokeObjectURL = vi.fn();
beforeEach(() => {
	failed.mockReset();
	succeeded.mockReset();
	fetchExport.mockReset();
	createObjectURL.mockClear();
	vi.stubGlobal("fetch", fetchExport);
	const OriginalURL = globalThis.URL;
	vi.stubGlobal(
		"URL",
		class extends OriginalURL {
			static createObjectURL = createObjectURL;
			static revokeObjectURL = revokeObjectURL;
		},
	);
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

it("ZIPの取得中は二重送信を防ぎ、完了したファイルをダウンロードする", async () => {
	let resolveExport!: (response: Response) => void;
	fetchExport.mockReturnValue(
		new Promise((resolve) => {
			resolveExport = resolve;
		}),
	);
	render(
		<IntlProvider locale="ja" messages={messages.ja}>
			<ExportPagesButton />
		</IntlProvider>,
	);
	fireEvent.click(
		screen.getByRole("button", { name: "Markdown＋画像を書き出す" }),
	);
	const preparing = screen.getByRole("button", { name: "書き出し中…" });
	expect(preparing).toBeDisabled();
	fireEvent.click(preparing);
	expect(fetchExport).toHaveBeenCalledTimes(1);
	resolveExport(
		new Response(new Uint8Array([80, 75]), {
			headers: { "Content-Type": "application/zip" },
		}),
	);
	await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1));
	expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
	expect(
		screen.getByRole("button", { name: "Markdown＋画像を書き出す" }),
	).toBeEnabled();
	expect(succeeded).toHaveBeenCalled();
});

it.each([
	[
		401,
		"application/zip",
		"ログインし直してから、もう一度書き出してください。",
	],
	[500, "application/json", "書き出せませんでした。もう一度お試しください。"],
	[200, "text/html", "書き出せませんでした。もう一度お試しください。"],
])(
	"HTTP %s・%sではファイルを保存せず、エラーを表示して再試行できる",
	async (status, contentType, message) => {
		fetchExport.mockResolvedValue(
			new Response("error", {
				status,
				headers: { "Content-Type": contentType },
			}),
		);
		render(
			<IntlProvider locale="ja" messages={messages.ja}>
				<ExportPagesButton />
			</IntlProvider>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Markdown＋画像を書き出す" }),
		);
		await waitFor(() => expect(failed).toHaveBeenCalledWith(message));
		expect(createObjectURL).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "Markdown＋画像を書き出す" }),
		).toBeEnabled();
	},
);
