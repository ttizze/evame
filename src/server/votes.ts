import type {
	SqlExecutor,
	TranslationVoteRow,
	TursoDatabase,
} from "../db/turso-types";
import { InvalidInputError, NotFoundError } from "../domain/errors";
import { parsePositiveId, resolveVoteTransition } from "../domain/vote";

type VoteRequest = {
	translationId: number;
	isUpvote: boolean;
	userId: string;
};

export type TranslationVoteResult = {
	translationId: number;
	point: number;
	isUpvote: boolean | null;
};

function parseVoteRequest(input: unknown): VoteRequest {
	if (typeof input !== "object" || input === null) {
		throw new InvalidInputError("投票入力が不正です");
	}
	const value = input as Record<string, unknown>;
	if (typeof value.userId !== "string" || value.userId.trim().length === 0) {
		throw new InvalidInputError("認証済みユーザーIDが不正です");
	}
	if (typeof value.isUpvote !== "boolean") {
		throw new InvalidInputError("isUpvote は boolean で指定してください");
	}
	return {
		translationId: parsePositiveId(value.translationId, "translationId"),
		isUpvote: value.isUpvote,
		userId: value.userId,
	};
}

function readInteger(value: unknown, fieldName: string): number {
	const number = typeof value === "bigint" ? Number(value) : value;
	if (typeof number !== "number" || !Number.isSafeInteger(number)) {
		throw new InvalidInputError(`${fieldName} が不正です`);
	}
	return number;
}

function readVote(value: TranslationVoteRow["is_upvote"]): boolean {
	if (value === true || value === 1) return true;
	if (value === false || value === 0) return false;
	throw new InvalidInputError("既存の投票状態が不正です");
}

export async function voteTranslation(
	db: TursoDatabase,
	input: unknown,
): Promise<TranslationVoteResult> {
	const request = parseVoteRequest(input);

	return db.transaction(async (transaction: SqlExecutor) => {
		const translation = await transaction.get<{ id: number; point: number }>(
			`SELECT translations.id, translations.point
			 FROM translations
			 INNER JOIN segments ON segments.id = translations.segment_id
			 INNER JOIN scriptures ON scriptures.id = segments.scripture_id
			 WHERE translations.id = ? AND scriptures.published_at IS NOT NULL
			 LIMIT 1`,
			[request.translationId],
		);
		if (!translation) throw new NotFoundError("翻訳が見つかりません");

		const previousVote = await transaction.get<TranslationVoteRow>(
			`SELECT translation_id, user_id, is_upvote, created_at, updated_at
				 FROM translation_votes
				 WHERE translation_id = ? AND user_id = ?
				 LIMIT 1`,
			[request.translationId, request.userId],
		);
		const transition = resolveVoteTransition(
			previousVote ? readVote(previousVote.is_upvote) : undefined,
			request.isUpvote,
		);

		if (transition.action === "delete") {
			await transaction.run(
				"DELETE FROM translation_votes WHERE translation_id = ? AND user_id = ?",
				[request.translationId, request.userId],
			);
		} else if (transition.action === "update") {
			await transaction.run(
				`UPDATE translation_votes
				 SET is_upvote = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
					WHERE translation_id = ? AND user_id = ?`,
				[request.isUpvote ? 1 : 0, request.translationId, request.userId],
			);
		} else {
			await transaction.run(
				`INSERT INTO translation_votes
					 (translation_id, user_id, is_upvote)
					 VALUES (?, ?, ?)`,
				[request.translationId, request.userId, request.isUpvote ? 1 : 0],
			);
		}

		await transaction.run(
			"UPDATE translations SET point = point + ? WHERE id = ?",
			[transition.pointDelta, request.translationId],
		);
		const updated = await transaction.get<{ point: number }>(
			"SELECT point FROM translations WHERE id = ? LIMIT 1",
			[request.translationId],
		);
		if (!updated) throw new NotFoundError("翻訳が見つかりません");

		return {
			translationId: request.translationId,
			point: readInteger(updated.point, "point"),
			isUpvote: transition.finalIsUpvote,
		};
	});
}
