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
		const rootSlug = options.rootSlug ?? "tipitaka";
		const snapshot = await source.load(rootSlug);
		const plan = buildMigrationPlan(snapshot, rootSlug);
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
