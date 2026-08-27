import type {
	SqlExecutor,
	TranslationJobRow,
	TursoDatabase,
} from "../db/turso-types";
import {
	ForbiddenError,
	InvalidInputError,
	NotFoundError,
} from "../domain/errors";
import {
	parseNonEmptyText,
	parsePositiveId,
	parseSupportedLocale,
} from "../domain/vote";

const TRANSLATION_JOB_STATUSES = [
	"PENDING",
	"IN_PROGRESS",
	"COMPLETED",
	"FAILED",
] as const;

type TranslationJobStatus = (typeof TRANSLATION_JOB_STATUSES)[number];

export type TranslationJob = {
	id: string;
	scriptureId: number | null;
	locale: string;
	status: TranslationJobStatus;
	progress: number;
	total: number;
	error: string;
	model: string;
	requestedBy: string | null;
	createdAt: string;
	updatedAt: string;
};

function parseStatus(value: unknown): TranslationJobStatus {
	if (
		typeof value !== "string" ||
		!(TRANSLATION_JOB_STATUSES as readonly string[]).includes(value)
	) {
		throw new InvalidInputError("翻訳ジョブのstatusが不正です");
	}
	return value as TranslationJobStatus;
}

function parseNonNegativeInteger(value: unknown, fieldName: string): number {
	if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
		throw new InvalidInputError(`${fieldName} は0以上の整数で指定してください`);
	}
	return value;
}

function parseError(value: unknown): string {
	if (typeof value !== "string") {
		throw new InvalidInputError("error は文字列で指定してください");
	}
	return value;
}

function parseOptionalScriptureId(value: unknown): number | null {
	if (value === undefined || value === null) return null;
	return parsePositiveId(value, "scriptureId");
}

function parseUserId(value: unknown): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new InvalidInputError("認証済みユーザーIDが不正です");
	}
	return value;
}

function mapJob(row: TranslationJobRow): TranslationJob {
	if (
		(row.scripture_id !== null && !Number.isSafeInteger(row.scripture_id)) ||
		!Number.isSafeInteger(row.progress) ||
		!Number.isSafeInteger(row.total) ||
		typeof row.id !== "string" ||
		row.id.trim().length === 0
	) {
		throw new InvalidInputError("翻訳ジョブ行が不正です");
	}
	const status = parseStatus(row.status);
	return {
		id: row.id,
		scriptureId: row.scripture_id,
		locale: row.locale,
		status,
		progress: row.progress,
		total: row.total,
		error: row.error,
		model: row.model,
		requestedBy: row.requested_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

async function findOwnedJob(
	transaction: SqlExecutor,
	jobId: string,
	userId: string,
): Promise<TranslationJobRow> {
	const row = await transaction.get<TranslationJobRow>(
		`SELECT id, scripture_id, locale, status, progress, total, error,
				model, requested_by, created_at, updated_at
		 FROM translation_jobs WHERE id = ? LIMIT 1`,
		[jobId],
	);
	if (!row) throw new NotFoundError("翻訳ジョブが見つかりません");
	if (row.requested_by !== userId) {
		throw new ForbiddenError("この翻訳ジョブを操作する権限がありません");
	}
	return row;
}

export async function createTranslationJob(
	db: TursoDatabase,
	input: unknown,
): Promise<TranslationJob> {
	if (typeof input !== "object" || input === null) {
		throw new InvalidInputError("翻訳ジョブ入力が不正です");
	}
	const value = input as Record<string, unknown>;
	const userId = parseUserId(value.userId);
	const locale = parseSupportedLocale(value.locale);
	const model = parseNonEmptyText(value.model, "model");
	const scriptureId = parseOptionalScriptureId(value.scriptureId);
	const total =
		value.total === undefined
			? 0
			: parseNonNegativeInteger(value.total, "total");
	return db.transaction(async (transaction) => {
		if (scriptureId !== null) {
			const scripture = await transaction.get<{ id: number }>(
				"SELECT id FROM scriptures WHERE id = ? LIMIT 1",
				[scriptureId],
			);
			if (!scripture) throw new NotFoundError("経典が見つかりません");
		}

		const id = globalThis.crypto.randomUUID();
		await transaction.run(
			`INSERT INTO translation_jobs
			 (id, scripture_id, locale, status, progress, total, error, model, requested_by)
			 VALUES (?, ?, ?, 'PENDING', 0, ?, '', ?, ?)`,
			[id, scriptureId, locale, total, model, userId],
		);
		const row = await transaction.get<TranslationJobRow>(
			`SELECT id, scripture_id, locale, status, progress, total, error,
					model, requested_by, created_at, updated_at
			 FROM translation_jobs WHERE id = ? LIMIT 1`,
			[id],
		);
		if (!row) throw new Error("作成した翻訳ジョブを取得できませんでした");
		return mapJob(row);
	});
}

export async function getTranslationJob(
	db: TursoDatabase,
	input: unknown,
): Promise<TranslationJob> {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("翻訳ジョブ入力が不正です");
	}
	const value = input as Record<string, unknown>;
	const jobId = parseNonEmptyText(value.jobId, "jobId");
	const userId = parseUserId(value.userId);
	return db.transaction(async (transaction) => {
		return mapJob(await findOwnedJob(transaction, jobId, userId));
	});
}

export async function updateTranslationJob(
	db: TursoDatabase,
	input: unknown,
): Promise<TranslationJob> {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("翻訳ジョブ入力が不正です");
	}
	const value = input as Record<string, unknown>;
	const jobId = parseNonEmptyText(value.jobId, "jobId");
	const userId = parseUserId(value.userId);
	const status = parseStatus(value.status);
	const progress = parseNonNegativeInteger(value.progress, "progress");
	const total = parseNonNegativeInteger(value.total, "total");
	const error = parseError(value.error);
	if (progress > total && total !== 0) {
		throw new InvalidInputError("progress は total 以下で指定してください");
	}
	return db.transaction(async (transaction) => {
		await findOwnedJob(transaction, jobId, userId);
		await transaction.run(
			`UPDATE translation_jobs
			 SET status = ?, progress = ?, total = ?, error = ?,
				 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
			 WHERE id = ?`,
			[status, progress, total, error, jobId],
		);
		const row = await transaction.get<TranslationJobRow>(
			`SELECT id, scripture_id, locale, status, progress, total, error,
					model, requested_by, created_at, updated_at
			 FROM translation_jobs WHERE id = ? LIMIT 1`,
			[jobId],
		);
		if (!row) throw new NotFoundError("翻訳ジョブが見つかりません");
		return mapJob(row);
	});
}
