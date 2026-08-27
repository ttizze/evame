import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PageViewCount } from "./page-view-count.client";

describe("PageViewCount", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("初期値を表示し、API応答後に最新の閲覧数へ更新する", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				counts: { 10: 42, 11: 7 },
			}),
		});
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		render(
			<PageViewCount batchPageIds={[10, 11]} initialCount={1} pageId={10} />,
		);

		expect(screen.getByText("1")).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText("42")).toBeInTheDocument();
		});
		expect(fetchMock).toHaveBeenCalledWith("/api/page-views?ids=10,11");
	});

	it("batchPageIdsがない場合はAPIを呼ばず初期値を表示する", () => {
		const fetchMock = vi.fn();
		globalThis.fetch = fetchMock as unknown as typeof fetch;

		render(<PageViewCount initialCount={9} pageId={10} />);

		expect(screen.getByText("9")).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
