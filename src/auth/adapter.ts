import type { BetterAuthOptions } from "@better-auth/core";
import {
	type CleanedWhere,
	type CustomAdapter,
	createAdapterFactory,
	type DBAdapter,
	type DBTransactionAdapter,
} from "@better-auth/core/db/adapter";
import type {
	SqlArguments,
	SqlExecutor,
	SqlValue,
	TursoDatabase,
} from "@/db/turso-types";

type WhereResult = {
	clause: string;
	args: SqlArguments;
};

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/u;

function quoteIdentifier(identifier: string): string {
	if (!IDENTIFIER.test(identifier)) {
		throw new Error("認証アダプターの識別子が不正です");
	}
	return `"${identifier}"`;
}

function toSqlValue(value: unknown): SqlValue {
	if (value instanceof Date) return value.toISOString();
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "bigint" ||
		typeof value === "boolean" ||
		value === null ||
		value instanceof Uint8Array
	) {
		return value;
	}
	throw new Error("認証アダプターが対応しない値を受け取りました");
}

function escapeLikePattern(value: string): string {
	return value
		.replaceAll("\\", "\\\\")
		.replaceAll("%", "\\%")
		.replaceAll("_", "\\_");
}

function whereClause(where: CleanedWhere[] | undefined): WhereResult {
	if (!where || where.length === 0) return { clause: "", args: [] };

	const fragments: string[] = [];
	const args: SqlValue[] = [];
	for (const [index, condition] of where.entries()) {
		const column = quoteIdentifier(condition.field);
		const value = condition.value;
		const insensitive = condition.mode === "insensitive";
		const operation = condition.operator ?? "eq";
		let expression: string;
		let values: SqlValue[] = [];

		if (operation === "in" || operation === "not_in") {
			if (!Array.isArray(value)) {
				throw new Error("認証アダプターのIN条件が不正です");
			}
			if (value.length === 0) {
				expression = operation === "in" ? "0" : "1";
			} else {
				const stringValues = value.every((item) => typeof item === "string");
				const compareColumn =
					insensitive && stringValues ? `LOWER(${column})` : column;
				values = value.map((item) => {
					const normalized =
						insensitive && stringValues ? String(item).toLowerCase() : item;
					return toSqlValue(normalized);
				});
				expression = `${compareColumn} ${operation === "in" ? "IN" : "NOT IN"} (${values.map(() => "?").join(", ")})`;
			}
		} else if (value === null && (operation === "eq" || operation === "ne")) {
			expression = `${column} IS ${operation === "eq" ? "" : "NOT "}NULL`;
		} else if (
			(operation === "contains" ||
				operation === "starts_with" ||
				operation === "ends_with") &&
			typeof value === "string"
		) {
			const escaped = escapeLikePattern(value);
			const pattern =
				operation === "contains"
					? `%${escaped}%`
					: operation === "starts_with"
						? `${escaped}%`
						: `%${escaped}`;
			const compareColumn = insensitive ? `LOWER(${column})` : column;
			expression = `${compareColumn} LIKE ? ESCAPE '\\'`;
			values = [toSqlValue(insensitive ? pattern.toLowerCase() : pattern)];
		} else {
			const compareColumn =
				insensitive && typeof value === "string" ? `LOWER(${column})` : column;
			const compareValue =
				insensitive && typeof value === "string" ? value.toLowerCase() : value;
			const sqlOperator =
				operation === "ne"
					? "<>"
					: operation === "lt"
						? "<"
						: operation === "lte"
							? "<="
							: operation === "gt"
								? ">"
								: operation === "gte"
									? ">="
									: "=";
			expression = `${compareColumn} ${sqlOperator} ?`;
			values = [toSqlValue(compareValue)];
		}

		fragments.push(
			`${index === 0 ? "" : condition.connector === "OR" ? " OR " : " AND "}(${expression})`,
		);
		args.push(...values);
	}

	return { clause: ` WHERE ${fragments.join("")}`, args };
}

function selectedColumns(
	select: string[] | undefined,
	model: string,
	getFieldName: (input: { model: string; field: string }) => string,
): string {
	if (!select || select.length === 0) return "*";
	return [
		...new Set(
			select.map((field) => quoteIdentifier(getFieldName({ model, field }))),
		),
	].join(", ");
}

function createCustomAdapter(
	executor: SqlExecutor,
	getFieldName: (input: { model: string; field: string }) => string,
): CustomAdapter {
	return {
		async create<T extends Record<string, unknown>>({
			data,
			model,
		}: {
			data: T;
			model: string;
			select?: string[];
		}) {
			const entries = Object.entries(data).filter(
				([, value]) => value !== undefined,
			);
			if (entries.length === 0) {
				await executor.run(
					`INSERT INTO ${quoteIdentifier(model)} DEFAULT VALUES`,
				);
				return { ...data } as T;
			}

			const columns = entries
				.map(([field]) => quoteIdentifier(field))
				.join(", ");
			const placeholders = entries.map(() => "?").join(", ");
			const args = entries.map(([, value]) => toSqlValue(value));
			await executor.run(
				`INSERT INTO ${quoteIdentifier(model)} (${columns}) VALUES (${placeholders})`,
				args,
			);

			const id = data.id;
			if (id === undefined) return { ...data } as T;
			return (
				(await executor.get<T>(
					`SELECT * FROM ${quoteIdentifier(model)} WHERE ${quoteIdentifier("id")} = ? LIMIT 1`,
					[toSqlValue(id)],
				)) ?? ({ ...data } as T)
			);
		},

		async update<T>({
			model,
			where,
			update,
		}: {
			model: string;
			where: CleanedWhere[];
			update: T;
		}) {
			const entries = Object.entries(update as Record<string, unknown>).filter(
				([, value]) => value !== undefined,
			);
			if (entries.length > 0) {
				const assignments = entries
					.map(([field]) => `${quoteIdentifier(field)} = ?`)
					.join(", ");
				const args = entries.map(([, value]) => toSqlValue(value));
				const condition = whereClause(where);
				await executor.run(
					`UPDATE ${quoteIdentifier(model)} SET ${assignments}${condition.clause}`,
					[...args, ...condition.args],
				);
			}
			const condition = whereClause(where);
			return (
				(await executor.get<T>(
					`SELECT * FROM ${quoteIdentifier(model)}${condition.clause} LIMIT 1`,
					condition.args,
				)) ?? null
			);
		},

		async updateMany({
			model,
			where,
			update,
		}: {
			model: string;
			where: CleanedWhere[];
			update: Record<string, unknown>;
		}) {
			const entries = Object.entries(update).filter(
				([, value]) => value !== undefined,
			);
			if (entries.length === 0) return 0;
			const assignments = entries
				.map(([field]) => `${quoteIdentifier(field)} = ?`)
				.join(", ");
			const args = entries.map(([, value]) => toSqlValue(value));
			const condition = whereClause(where);
			const result = await executor.run(
				`UPDATE ${quoteIdentifier(model)} SET ${assignments}${condition.clause}`,
				[...args, ...condition.args],
			);
			return result.changes;
		},

		async findOne<T>({
			model,
			where,
			select,
		}: {
			model: string;
			where: CleanedWhere[];
			select?: string[];
		}) {
			const condition = whereClause(where);
			return (
				(await executor.get<T>(
					`SELECT ${selectedColumns(select, model, getFieldName)} FROM ${quoteIdentifier(model)}${condition.clause} LIMIT 1`,
					condition.args,
				)) ?? null
			);
		},

		async findMany<T>({
			model,
			where,
			limit,
			select,
			sortBy,
			offset,
		}: {
			model: string;
			where?: CleanedWhere[];
			limit: number;
			select?: string[];
			sortBy?: { field: string; direction: "asc" | "desc" };
			offset?: number;
		}) {
			const condition = whereClause(where);
			const order = sortBy
				? ` ORDER BY ${quoteIdentifier(getFieldName({ model, field: sortBy.field }))} ${sortBy.direction === "desc" ? "DESC" : "ASC"}`
				: "";
			const safeLimit = Number.isSafeInteger(limit) && limit >= 0 ? limit : 100;
			const safeOffset =
				offset !== undefined && Number.isSafeInteger(offset) && offset >= 0
					? offset
					: 0;
			return executor.all<T>(
				`SELECT ${selectedColumns(select, model, getFieldName)} FROM ${quoteIdentifier(model)}${condition.clause}${order} LIMIT ? OFFSET ?`,
				[...condition.args, safeLimit, safeOffset],
			);
		},

		async delete({ model, where }: { model: string; where: CleanedWhere[] }) {
			const condition = whereClause(where);
			await executor.run(
				`DELETE FROM ${quoteIdentifier(model)}${condition.clause}`,
				condition.args,
			);
		},

		async deleteMany({
			model,
			where,
		}: {
			model: string;
			where: CleanedWhere[];
		}) {
			const condition = whereClause(where);
			const result = await executor.run(
				`DELETE FROM ${quoteIdentifier(model)}${condition.clause}`,
				condition.args,
			);
			return result.changes;
		},

		async count({ model, where }) {
			const condition = whereClause(where);
			const row = await executor.get<{ count: number | bigint }>(
				`SELECT COUNT(*) AS count FROM ${quoteIdentifier(model)}${condition.clause}`,
				condition.args,
			);
			return typeof row?.count === "bigint"
				? Number(row.count)
				: (row?.count ?? 0);
		},
	};
}

function createFactory(
	executor: SqlExecutor,
	transactionDatabase?: TursoDatabase,
): (options: BetterAuthOptions) => DBAdapter<BetterAuthOptions> {
	let currentOptions: BetterAuthOptions | undefined;
	const factory = createAdapterFactory<BetterAuthOptions>({
		config: {
			adapterId: "turso",
			adapterName: "Turso libSQL",
			usePlural: false,
			supportsDates: false,
			supportsBooleans: false,
			supportsJSON: false,
			supportsArrays: false,
			supportsNumericIds: false,
			transaction: transactionDatabase
				? async <R>(
						callback: (
							trx: DBTransactionAdapter<BetterAuthOptions>,
						) => Promise<R>,
					) => {
						const options = currentOptions;
						if (!options)
							throw new Error("認証アダプターが初期化されていません");
						return transactionDatabase.transaction(async (transaction) => {
							const transactionAdapter = createFactory(transaction)(options);
							return callback(transactionAdapter);
						});
					}
				: false,
		},
		adapter: ({ getFieldName }) => createCustomAdapter(executor, getFieldName),
	});

	return (options) => {
		currentOptions = options;
		return factory(options);
	};
}

/** Better Auth の database 設定へ渡す、Workers 対応の libSQL adapter。 */
export function createTursoAdapter(
	database: TursoDatabase,
): (options: BetterAuthOptions) => DBAdapter<BetterAuthOptions> {
	return createFactory(database, database);
}

export { escapeLikePattern, quoteIdentifier, whereClause };
