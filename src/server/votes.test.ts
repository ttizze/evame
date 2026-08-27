import { describe, expect, test } from "vitest";
import type { SqlExecutor, TursoDatabase } from "../db/turso-types";
import { NotFoundError, UnauthenticatedError } from "../domain/errors";
import { hashSessionToken } from "./session";
import { voteTranslation } from "./votes";

function createVoteDb(
	options: {
		translationExists?: boolean;
		published?: boolean;
		previous?: boolean;
	} = {},
) {
	const state = {
		point: 0,
		translationExists: options.translationExists ?? true,
		published: options.published ?? true,
		vote: options.previous,
	};
	const token = "valid-session";
	const db: TursoDatabase = {
		async get<T>(sql: string, args = []) {
			if (sql.includes("FROM sessions AS s")) {
				if (String(args[0]) !== (await hashSessionToken(token)))
					return undefined;
				return {
					id: "user-1",
					email: "person@example.com",
					name: "Person",
					expires_at: "2099-01-01T00:00:00.000Z",
				} as T;
			}
			if (sql.includes("SELECT translations.id, translations.point")) {
				return state.translationExists && state.published
					? ({ id: 1, point: state.point } as T)
					: undefined;
			}
			if (sql.includes("FROM translation_votes")) {
				if (state.vote === undefined) return undefined;
				return {
					translation_id: 1,
					user_id: "user-1",
					is_upvote: state.vote ? 1 : 0,
					created_at: "2099-01-01T00:00:00.000Z",
					updated_at: "2099-01-01T00:00:00.000Z",
				} as T;
			}
			if (sql.includes("SELECT point FROM translations")) {
				return state.translationExists
					? ({ point: state.point } as T)
					: undefined;
			}
			return undefined;
		},
		async all<T>(_sql: string, _args = []) {
			return [] as T[];
		},
		async run(sql: string, args = []) {
			if (sql.includes("DELETE FROM translation_votes")) {
				state.vote = undefined;
			} else if (sql.includes("UPDATE translation_votes")) {
				state.vote = Number(args[0]) === 1;
			} else if (sql.includes("INSERT INTO translation_votes")) {
				state.vote = Number(args[2]) === 1;
			} else if (sql.includes("UPDATE translations SET point")) {
				state.point += Number(args[0]);
			}
			return { changes: 1, lastInsertRowid: undefined };
		},
		async transaction<T>(callback: (transaction: SqlExecutor) => Promise<T>) {
			return callback(this);
		},
		async close() {},
	};
	return { db, state, token };
}

describe("翻訳投票server function", () => {
	test("有効セッションの新規賛成票でpointと投票状態を更新する", async () => {
		const { db, state, token } = createVoteDb();
		expect(
			await voteTranslation(db, {
				translationId: 1,
				isUpvote: true,
				sessionToken: token,
			}),
		).toEqual({ translationId: 1, point: 1, isUpvote: true });
		expect(state).toMatchObject({ point: 1, vote: true });
	});

	test("反対票から賛成票へ変更するとpointが2増える", async () => {
		const { db, state, token } = createVoteDb({ previous: false });
		const result = await voteTranslation(db, {
			translationId: 1,
			isUpvote: true,
			sessionToken: token,
		});
		expect(result).toEqual({ translationId: 1, point: 2, isUpvote: true });
		expect(state).toMatchObject({ point: 2, vote: true });
	});

	test("同じ賛成票を押すとpointを戻して投票を削除する", async () => {
		const { db, state, token } = createVoteDb({ previous: true });
		state.point = 1;
		const result = await voteTranslation(db, {
			translationId: 1,
			isUpvote: true,
			sessionToken: token,
		});
		expect(result).toEqual({ translationId: 1, point: 0, isUpvote: null });
		expect(state).toMatchObject({ point: 0, vote: undefined });
	});

	test("未認証は投票できず、存在しない翻訳はnot foundになる", async () => {
		const unauthenticated = createVoteDb();
		await expect(
			voteTranslation(unauthenticated.db, {
				translationId: 1,
				isUpvote: true,
				sessionToken: "unknown-session",
			}),
		).rejects.toBeInstanceOf(UnauthenticatedError);

		const missing = createVoteDb({ translationExists: false });
		await expect(
			voteTranslation(missing.db, {
				translationId: 1,
				isUpvote: true,
				sessionToken: missing.token,
			}),
		).rejects.toBeInstanceOf(NotFoundError);
	});

	test("非公開経典に属する翻訳には投票できない", async () => {
		const unpublished = createVoteDb({ published: false });

		await expect(
			voteTranslation(unpublished.db, {
				translationId: 1,
				isUpvote: true,
				sessionToken: unpublished.token,
			}),
		).rejects.toBeInstanceOf(NotFoundError);
	});
});
