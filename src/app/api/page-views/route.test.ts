import { beforeEach, describe, expect, it, vi } from "vitest";

const selectFromMock = vi.fn();
const selectMock = vi.fn();
const whereMock = vi.fn();
const executeMock = vi.fn();

vi.mock("@/db", () => ({
	db: {
		selectFrom: selectFromMock,
	},
}));

selectFromMock.mockImplementation(() => ({
	select: selectMock,
}));
selectMock.mockImplementation(() => ({
	where: whereMock,
}));
whereMock.mockImplementation(() => ({
	execute: executeMock,
}));
const { GET } = await import("./route");

describe("GET /api/page-views", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		executeMock.mockResolvedValue([]);
	});

	it("指定したページID群の閲覧数を返し未登録ページは0を返す", async () => {
		executeMock.mockResolvedValue([{ pageId: 10, count: 12 }]);

		const response = await GET(
			new Request("http://localhost/api/page-views?ids=10,11"),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body).toEqual({
			counts: {
				10: 12,
				11: 0,
			},
		});
		expect(selectFromMock).toHaveBeenCalledWith("pageViews");
		expect(whereMock).toHaveBeenCalledWith("pageId", "in", [10, 11]);
	});

	it("idsが未指定なら400を返す", async () => {
		const response = await GET(new Request("http://localhost/api/page-views"));
		expect(response.status).toBe(400);
		expect(selectFromMock).not.toHaveBeenCalled();
	});

	it("idsが数値でない場合は400を返す", async () => {
		const response = await GET(
			new Request("http://localhost/api/page-views?ids=abc,def"),
		);
		expect(response.status).toBe(400);
		expect(selectFromMock).not.toHaveBeenCalled();
	});
});
