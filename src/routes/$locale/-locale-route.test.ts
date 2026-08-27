import { isNotFound } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	listScriptures: vi.fn(),
	getScripture: vi.fn(),
	createTranslation: vi.fn(),
	createTranslationJob: vi.fn(),
	getTranslationJob: vi.fn(),
	voteTranslation: vi.fn(),
}));

vi.mock("./-scripture-data", () => ({
	createTranslation: state.createTranslation,
	createTranslationJob: state.createTranslationJob,
	getScripture: state.getScripture,
	getTranslationJob: state.getTranslationJob,
	listScriptures: state.listScriptures,
	supportedLocales: [{ code: "en", label: "English" }],
	voteTranslation: state.voteTranslation,
}));

import { Route as ScriptureDetailRoute } from "./$slug";
import { Route as ScriptureIndexRoute } from "./index";

type Loader = (context: unknown) => unknown;

function routeLoader(route: unknown): Loader {
	const options = (route as { options: { loader?: Loader } }).options;
	if (!options.loader) throw new Error("loaderが見つかりません");
	return options.loader;
}

async function runLoader(loader: Loader, context: unknown) {
	try {
		return { value: await loader(context), error: undefined };
	} catch (error) {
		return { value: undefined, error };
	}
}

describe("locale付き経典routeのloader", () => {
	it("一覧の未対応localeをnotFoundとして扱い、server functionを呼ばない", async () => {
		const result = await runLoader(routeLoader(ScriptureIndexRoute), {
			params: { locale: "eo" },
		});

		expect(isNotFound(result.error)).toBe(true);
		expect(state.listScriptures).not.toHaveBeenCalled();
	});

	it("詳細の未対応localeをnotFoundとして扱い、server functionを呼ばない", async () => {
		const result = await runLoader(routeLoader(ScriptureDetailRoute), {
			params: { locale: "pt-BR", slug: "source" },
		});

		expect(isNotFound(result.error)).toBe(true);
		expect(state.getScripture).not.toHaveBeenCalled();
	});

	it("対応localeの一覧はserver functionへ渡す", async () => {
		state.listScriptures.mockResolvedValue([]);

		await expect(
			runLoader(routeLoader(ScriptureIndexRoute), {
				params: { locale: "ja" },
			}),
		).resolves.toMatchObject({ value: [] });
		expect(state.listScriptures).toHaveBeenCalledWith({
			data: { locale: "ja" },
		});
	});
});
