import { InvalidInputError } from "./errors";
import { isSupportedLocale, type SupportedLocale } from "./locales";

export type VoteAction = "create" | "update" | "delete";

export type VoteTransition = {
	action: VoteAction;
	pointDelta: 1 | -1 | 2 | -2;
	finalIsUpvote: boolean | null;
};

export const MAX_TRANSLATION_TEXT_LENGTH = 50_000;

/**
 * 1ユーザーにつき1票だけを許可する投票状態の遷移を計算する。
 * 同じボタンをもう一度押した場合は投票を取り消す。
 */
export function resolveVoteTransition(
	previousIsUpvote: boolean | null | undefined,
	requestedIsUpvote: boolean,
): VoteTransition {
	if (typeof requestedIsUpvote !== "boolean") {
		throw new InvalidInputError("isUpvote は boolean で指定してください");
	}

	if (previousIsUpvote !== null && previousIsUpvote !== undefined) {
		if (typeof previousIsUpvote !== "boolean") {
			throw new InvalidInputError("既存の投票状態が不正です");
		}
		if (previousIsUpvote === requestedIsUpvote) {
			return {
				action: "delete",
				pointDelta: requestedIsUpvote ? -1 : 1,
				finalIsUpvote: null,
			};
		}
		return {
			action: "update",
			pointDelta: requestedIsUpvote ? 2 : -2,
			finalIsUpvote: requestedIsUpvote,
		};
	}

	return {
		action: "create",
		pointDelta: requestedIsUpvote ? 1 : -1,
		finalIsUpvote: requestedIsUpvote,
	};
}

export function parsePositiveId(value: unknown, fieldName: string): number {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
		throw new InvalidInputError(`${fieldName} は正の整数で指定してください`);
	}
	return value;
}

export function parseLocale(value: unknown): string {
	if (
		typeof value !== "string" ||
		!/^\p{L}{2,8}(?:[-_][\p{L}\p{N}]{1,8})*$/u.test(value)
	) {
		throw new InvalidInputError("locale は有効なロケールで指定してください");
	}
	return value.replaceAll("_", "-").toLowerCase();
}

export function parseSupportedLocale(value: unknown): SupportedLocale {
	const locale = parseLocale(value);
	if (!isSupportedLocale(locale)) {
		throw new InvalidInputError("対応していないlocaleです");
	}
	return locale;
}

export function parseNonEmptyText(value: unknown, fieldName: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new InvalidInputError(`${fieldName} は空にできません`);
	}
	return value;
}

export function parseTranslationInput(input: unknown): {
	segmentId: number;
	locale: string;
	text: string;
} {
	if (typeof input !== "object" || input === null) {
		throw new InvalidInputError("翻訳入力が不正です");
	}
	const value = input as Record<string, unknown>;
	const text = parseNonEmptyText(value.text, "text");
	if (text.length > MAX_TRANSLATION_TEXT_LENGTH) {
		throw new InvalidInputError("text が長すぎます");
	}
	return {
		segmentId: parsePositiveId(value.segmentId, "segmentId"),
		locale: parseLocale(value.locale),
		text,
	};
}

export type RankedTranslation = {
	id: number;
	point: number;
	createdAt: string;
	ownerUpvoted?: boolean;
};

/**
 * 経典所有者の賛成票を最優先にし、その後 point、作成日時、IDの順で決定する。
 * IDを最後のキーにすることで同じ日時の行も順序が揺れない。
 */
export function rankTranslations<T extends RankedTranslation>(
	translations: readonly T[],
): T[] {
	return [...translations].sort((left, right) => {
		const ownerVoteOrder =
			Number(right.ownerUpvoted === true) - Number(left.ownerUpvoted === true);
		if (ownerVoteOrder !== 0) return ownerVoteOrder;

		const pointOrder = right.point - left.point;
		if (pointOrder !== 0) return pointOrder;

		const leftTime = Date.parse(left.createdAt);
		const rightTime = Date.parse(right.createdAt);
		if (
			Number.isFinite(leftTime) &&
			Number.isFinite(rightTime) &&
			leftTime !== rightTime
		) {
			return rightTime - leftTime;
		}

		return right.id - left.id;
	});
}
