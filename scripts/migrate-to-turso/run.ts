import { buildMigrationPlan } from "./plan";
import { createPostgresSource, type PostgresSource } from "./source";
import type { TursoConnection } from "./target";
import {
	applyMigrationPlan,
	createTursoTarget,
	verifyMigrationCounts,
} from "./target";
import type { MigrationCounts, MigrationPlan } from "./types";

export interface MigrationRunOptions {
	dryRun?: boolean;
	rootSlug?: string;
	batchSize?: number;
	source?: PostgresSource;
	target?: TursoConnection;
	stdout?: (line: string) => void;
}

export interface MigrationRunResult {
	dryRun: boolean;
	plan: MigrationPlan;
	actualCounts: MigrationCounts | null;
}

function writeLine(stdout: (line: string) => void, value: unknown): void {
	stdout(JSON.stringify(value));
}

/**
 * エラーをCLIへ出す前に、接続URLや認証情報らしい値を除去する。
 * 実際のエラー本文をそのまま転送しないことで、SDK/ドライバーの
 * エラー形式が変わっても秘密値をログへ流さない。
 */
export function safeErrorMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : "Migration failed";
	return message
		.replace(/([a-z][a-z\d+.-]*:\/\/)([^\s/@]+)@/gi, "$1[redacted]@")
		.replace(/([?&][^=\s&]+)=([^&\s]+)/g, "$1[redacted]")
		.replace(
			/((?:password|passwd|secret|token|authorization|api[_-]?key)[=:]\s*)[^\s,;]+/gi,
			"$1[redacted]",
		);
}

/**
 * dry-runと本実行が同じ計画生成経路を使う移行オーケストレーター。
 * 外部接続は注入可能なので、実DBなしで件数・再実行性をテストできる。
 */
export async function runMigration(
	options: MigrationRunOptions = {},
): Promise<MigrationRunResult> {
	const dryRun = options.dryRun ?? false;
	const stdout = options.stdout ?? (() => {});
	let source = options.source;
	let ownsSource = false;
	if (!source) {
		source = await createPostgresSource();
		ownsSource = true;
	}

	try {
		const snapshot = await source.load(options.rootSlug ?? "tipitaka");
		const plan = buildMigrationPlan(snapshot);
		writeLine(stdout, {
			mode: dryRun ? "dry-run" : "apply",
			counts: plan.report.counts,
			skipped: plan.report.skipped,
		});

		if (dryRun) {
			return { dryRun, plan, actualCounts: null };
		}

		let target = options.target;
		let ownsTarget = false;
		if (!target) {
			target = await createTursoTarget();
			ownsTarget = true;
		}
		try {
			await applyMigrationPlan(target, plan, {
				batchSize: options.batchSize,
			});
			const actualCounts = await verifyMigrationCounts(target, plan);
			writeLine(stdout, { verified: actualCounts });
			return { dryRun, plan, actualCounts };
		} finally {
			if (ownsTarget) await target.close?.();
		}
	} finally {
		if (ownsSource) await source.close();
	}
}
