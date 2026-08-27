import { describe, expect, test } from "vitest";
import type { TursoDatabase } from "../db/turso-types";
import { InvalidInputError } from "../domain/errors";
import { addTranslation, listTranslations } from "./translations";

describe("翻訳server functionのlocale境界", () => {
	test("未対応localeの翻訳一覧と投稿をDBへ渡さず拒否する", async () => {
		const db = {} as TursoDatabase;

		await expect(
			listTranslations(db, { segmentId: 1, locale: "eo" }),
		).rejects.toBeInstanceOf(InvalidInputError);
		await expect(
			addTranslation(db, {
				segmentId: 1,
				locale: "pt-BR",
				text: "Translation",
				sessionToken: "session",
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
	});
});
