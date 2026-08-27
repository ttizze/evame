import { describe, expect, test, vi } from "vitest";
import type { TursoDatabase } from "../db/turso-types";
import { ForbiddenError, InvalidInputError } from "../domain/errors";
import {
	addTranslation,
	deleteTranslation,
	listTranslations,
} from "./translations";

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
				userId: "user-1",
			}),
		).rejects.toBeInstanceOf(InvalidInputError);
	});

	test("usersをJOINして作者情報と閲覧者の所有状態を候補へ返す", async () => {
		let listQuery = "";
		let listArgs: readonly unknown[] = [];
		const db = {
			get: vi.fn(async () => ({ id: 1 })),
			all: vi.fn(async (sql: string, args: readonly unknown[]) => {
				listQuery = sql;
				listArgs = args;
				return [
					{
						id: 10,
						segment_id: 1,
						locale: "ja",
						text: "公開された訳",
						point: 4,
						created_at: "2026-01-01T00:00:00.000Z",
						updated_at: "2026-01-01T00:00:00.000Z",
						user_id: "translator-1",
						source: "AI",
						ai_job_id: "job-1",
						owner_upvoted: 1,
						viewer_is_upvote: 0,
						user_name: "AI Translator",
						user_handle: "ai-translator",
						user_profile: "翻訳モデルの説明",
						user_is_ai: 1,
						user_total_points: 32,
						owned_by_viewer: 1,
					},
				];
			}),
		} as unknown as TursoDatabase;

		await expect(
			listTranslations(db, {
				segmentId: 1,
				locale: "ja",
				viewerUserId: "translator-1",
			}),
		).resolves.toEqual([
			{
				id: 10,
				segmentId: 1,
				locale: "ja",
				text: "公開された訳",
				point: 4,
				createdAt: "2026-01-01T00:00:00.000Z",
				updatedAt: "2026-01-01T00:00:00.000Z",
				userId: "translator-1",
				source: "AI",
				aiJobId: "job-1",
				ownerUpvoted: true,
				votedByViewer: false,
				userName: "AI Translator",
				userHandle: "ai-translator",
				userProfile: "翻訳モデルの説明",
				userIsAi: true,
				userTotalPoints: 32,
				ownedByViewer: true,
			},
		]);
		expect(listQuery).toContain("INNER JOIN users AS author");
		expect(listQuery).toContain("author.is_ai AS user_is_ai");
		expect(listQuery).toContain("owned_by_viewer");
		expect(listArgs).toEqual(["translator-1", "translator-1", 1, "ja"]);
	});

	test("候補削除は認証済み所有者だけに許可する", async () => {
		const run = vi.fn(async () => ({ changes: 1, lastInsertRowid: 0 }));
		const transaction = {
			get: vi.fn(async () => ({ id: 10, user_id: "owner" })),
			run,
		};
		const db = {
			transaction: async <T>(
				callback: (tx: typeof transaction) => Promise<T>,
			) => callback(transaction),
		} as unknown as TursoDatabase;

		await deleteTranslation(db, { translationId: 10, userId: "owner" });
		expect(run).toHaveBeenCalledWith(
			"DELETE FROM translations WHERE id = ?",
			[10],
		);

		run.mockClear();
		await expect(
			deleteTranslation(db, { translationId: 10, userId: "another-user" }),
		).rejects.toBeInstanceOf(ForbiddenError);
		expect(run).not.toHaveBeenCalled();
	});

	test("翻訳案作成時もJOINした作者情報を返す", async () => {
		const row = {
			id: 11,
			segment_id: 1,
			locale: "ja",
			text: "新しい訳",
			point: 0,
			created_at: "2026-01-01T00:00:00.000Z",
			updated_at: "2026-01-01T00:00:00.000Z",
			user_id: "writer",
			source: "USER" as const,
			ai_job_id: null,
			owner_upvoted: 0,
			user_name: "Writer",
			user_handle: "writer",
			user_profile: "研究者",
			user_is_ai: 0,
			user_total_points: 9,
			owned_by_viewer: 1,
		};
		let selectQuery = "";
		const transaction = {
			get: vi.fn(async (sql: string) => {
				if (sql.includes("SELECT segments.id")) return { id: 1 };
				selectQuery = sql;
				return row;
			}),
			run: vi.fn(async () => ({ changes: 1, lastInsertRowid: 11 })),
		};
		const db = {
			transaction: async <T>(
				callback: (tx: typeof transaction) => Promise<T>,
			) => callback(transaction),
		} as unknown as TursoDatabase;

		await expect(
			addTranslation(db, {
				segmentId: 1,
				locale: "ja",
				text: "新しい訳",
				userId: "writer",
			}),
		).resolves.toMatchObject({
			userName: "Writer",
			userHandle: "writer",
			userProfile: "研究者",
			userIsAi: false,
			userTotalPoints: 9,
			ownedByViewer: true,
		});
		expect(selectQuery).toContain("INNER JOIN users AS author");
	});
});
