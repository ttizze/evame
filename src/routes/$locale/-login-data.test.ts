import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUserFromHeadersMock, setResponseHeaderMock } = vi.hoisted(
	() => ({
		getCurrentUserFromHeadersMock: vi.fn(),
		setResponseHeaderMock: vi.fn(),
	}),
);

vi.mock("@/app/_service/current-user", () => ({
	getCurrentUserFromHeaders: getCurrentUserFromHeadersMock,
}));
vi.mock("@tanstack/react-start/server", () => ({
	getRequestHeaders: () => new Headers(),
	setResponseHeader: setResponseHeaderMock,
}));
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: <T>(handler: T) => handler,
		};
		return builder;
	},
}));

const { getLoginData } = await import("./-login-data");

describe("getLoginData", () => {
	beforeEach(() => {
		getCurrentUserFromHeadersMock
			.mockReset()
			.mockResolvedValue({ id: "user-id" });
		setResponseHeaderMock.mockReset();
	});

	it("認証済みユーザーを同一originのnextへ遷移させる", async () => {
		await expect(
			getLoginData({ data: { locale: "en", next: "/en/search?query=test" } }),
		).rejects.toMatchObject({
			options: { href: "/en/search?query=test" },
		});
	});

	it.each([
		"//attacker.example",
		"/\\attacker.example",
		"/%5cattacker.example",
	])("外部originとして解釈され得るnext %s をrootへ置き換える", async (next) => {
		await expect(
			getLoginData({ data: { locale: "en", next } }),
		).rejects.toMatchObject({ options: { href: "/" } });
	});
});
