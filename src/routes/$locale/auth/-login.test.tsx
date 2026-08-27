import { isNotFound, isRedirect } from "@tanstack/react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	hasLoginSession: vi.fn(),
}));

vi.mock("./-login-data", () => ({
	hasLoginSession: state.hasLoginSession,
}));

import LoginPage from "@/app/[locale]/(common-layout)/auth/login/page";
import { supportedLocales } from "@/domain/locales";
import { Route } from "./login";

type Loader = (context: unknown) => unknown;

type Head = (context: unknown) => unknown;

function routeLoader(): Loader {
	const loader = (Route as unknown as { options: { loader?: Loader } }).options
		.loader;
	if (!loader) throw new Error("ログインrouteのloaderが見つかりません");
	return loader;
}

function routeHead(): Head {
	const head = (Route as unknown as { options: { head?: Head } }).options.head;
	if (!head) throw new Error("ログインrouteのheadが見つかりません");
	return head;
}

describe("ロケール付きログインroute", () => {
	beforeEach(() => {
		state.hasLoginSession.mockReset();
	});

	it("origin配置のログインpageをroute componentとして使う", () => {
		expect(Route.options.component).toBe(LoginPage);
	});

	it.each(supportedLocales.map(({ code }) => code))(
		"対応する%s localeならログイン画面を表示する",
		async (locale) => {
			state.hasLoginSession.mockResolvedValue(false);

			await expect(
				routeLoader()({
					params: { locale },
					deps: { next: "/ja/source" },
				}),
			).resolves.toBeUndefined();
			expect(state.hasLoginSession).toHaveBeenCalledOnce();
		},
	);

	it("未対応localeは404として扱い、セッション判定を行わない", async () => {
		state.hasLoginSession.mockResolvedValue(false);

		await expect(
			routeLoader()({
				params: { locale: "xx" },
				deps: { next: "/ja/source" },
			}),
		).rejects.toSatisfy((error: unknown) => isNotFound(error));
		expect(state.hasLoginSession).not.toHaveBeenCalled();
	});

	it("ログイン画面を検索エンジンの索引対象外にする", () => {
		expect(routeHead()({ params: { locale: "ja" } })).toEqual({
			meta: [{ name: "robots", content: "noindex,nofollow" }],
		});
	});

	it("未認証ならログイン画面を表示し、セッション判定を行う", async () => {
		state.hasLoginSession.mockResolvedValue(false);

		await expect(
			routeLoader()({
				params: { locale: "ja" },
				deps: { next: "/ja/source" },
			}),
		).resolves.toBeUndefined();
		expect(state.hasLoginSession).toHaveBeenCalledOnce();
	});

	it("認証済みなら安全なnextへ遷移する", async () => {
		state.hasLoginSession.mockResolvedValue(true);

		const promise = routeLoader()({
			params: { locale: "ja" },
			deps: { next: "/ja/source?view=both" },
		});
		await expect(promise).rejects.toSatisfy((error: unknown) => {
			return (
				isRedirect(error) &&
				(error as { options?: { href?: string } }).options?.href ===
					"/ja/source?view=both"
			);
		});
	});

	it("外部nextはルートへフォールバックし、open redirectを防ぐ", async () => {
		state.hasLoginSession.mockResolvedValue(true);

		const promise = routeLoader()({
			params: { locale: "ja" },
			deps: { next: "https://attacker.example/steal" },
		});
		await expect(promise).rejects.toSatisfy((error: unknown) => {
			return (
				isRedirect(error) &&
				(error as { options?: { href?: string } }).options?.href === "/"
			);
		});
	});
});
