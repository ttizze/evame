import type {
	BinaryOperationNode,
	ColumnUpdateNode,
	InsertQueryNode,
	KyselyPlugin,
	OperationNode,
	PluginTransformQueryArgs,
	PluginTransformResultArgs,
	PrimitiveValueListNode,
	QueryResult,
	UnknownRow,
	ValueNode,
} from "kysely";
import {
	AliasNode as AliasNodeFactory,
	ColumnNode as ColumnNodeFactory,
	OperationNodeTransformer,
	PrimitiveValueListNode as PrimitiveValueListNodeFactory,
	ReferenceNode as ReferenceNodeFactory,
	ValueListNode as ValueListNodeFactory,
	ValueNode as ValueNodeFactory,
	ValuesNode as ValuesNodeFactory,
} from "kysely";

type InputCodec = "json" | "stringArray" | "timestamp" | "boolean";

const inputCodecs: Record<string, InputCodec> = {
	comments_enabled: "boolean",
	mdast_json: "json",
	target_locales: "stringArray",
	access_token_expires_at: "timestamp",
	archived_at: "timestamp",
	created_at: "timestamp",
	expires_at: "timestamp",
	finished_at: "timestamp",
	last_reply_at: "timestamp",
	last_used_at: "timestamp",
	published_at: "timestamp",
	refresh_token_expires_at: "timestamp",
	started_at: "timestamp",
	updated_at: "timestamp",
	email_verified: "boolean",
	is_ai: "boolean",
	is_deleted: "boolean",
	is_upvote: "boolean",
	read: "boolean",
};

const dateResultColumns = new Set([
	"accessTokenExpiresAt",
	"archivedAt",
	"createdAt",
	"expiresAt",
	"finishedAt",
	"lastReplyAt",
	"lastUsedAt",
	"publishedAt",
	"refreshTokenExpiresAt",
	"startedAt",
	"updatedAt",
	"translationJobCreatedAt",
	"translationJobUpdatedAt",
	"userCreatedAt",
	"userUpdatedAt",
]);

const booleanResultColumns = new Set([
	"commentsEnabled",
	"currentUserVoteIsUpvote",
	"emailVerified",
	"isAI",
	"isAi",
	"isDeleted",
	"isUpvote",
	"ownerUpvote",
	"read",
	"userIsAi",
]);

const resultCodecs = new Map<string, InputCodec>([
	["mdastJson", "json"],
	["targetLocales", "stringArray"],
	...[...dateResultColumns].map((column) => [column, "timestamp"] as const),
	...[...booleanResultColumns].map((column) => [column, "boolean"] as const),
]);

function getColumnName(node: OperationNode | undefined): string | undefined {
	if (!node) return undefined;
	if (ColumnNodeFactory.is(node)) return node.column.name;
	if (ReferenceNodeFactory.is(node)) return getColumnName(node.column);
	if (AliasNodeFactory.is(node)) return getColumnName(node.node);
	return undefined;
}

function encodeJsonValue(
	codec: "json" | "stringArray",
	value: unknown,
): unknown {
	if (codec === "stringArray") {
		if (
			!Array.isArray(value) ||
			!value.every((item) => typeof item === "string")
		) {
			throw new TypeError("targetLocales must be an array of strings");
		}
	}
	return JSON.stringify(value);
}

export function encodeTursoValue(codec: InputCodec, value: unknown): unknown {
	switch (codec) {
		case "timestamp": {
			if (value === null) return value;
			const date = decodeTimestamp(value);
			if (!(date instanceof Date)) {
				throw new TypeError("Invalid SQLite timestamp");
			}
			return date.getTime();
		}
		case "boolean":
			if (typeof value === "boolean") return value ? 1 : 0;
			return value;
		case "json":
		case "stringArray":
			return encodeJsonValue(codec, value);
	}
}

function markValue(
	value: OperationNode | undefined,
	codec: InputCodec | undefined,
	nodeCodecs: WeakMap<object, InputCodec>,
	primitiveCodecs: WeakMap<object, ReadonlyMap<number, InputCodec>>,
): void {
	if (!codec || !value) return;
	if (ValueNodeFactory.is(value)) {
		nodeCodecs.set(value, codec);
		return;
	}
	if (PrimitiveValueListNodeFactory.is(value)) {
		primitiveCodecs.set(
			value,
			new Map(value.values.map((_item, index) => [index, codec])),
		);
		return;
	}
	if (ValueListNodeFactory.is(value)) {
		for (const item of value.values) {
			if (item.kind === "ValueNode") {
				nodeCodecs.set(item, codec);
			}
		}
	}
}

function markInsertValues(
	node: InsertQueryNode,
	nodeCodecs: WeakMap<object, InputCodec>,
	primitiveCodecs: WeakMap<object, ReadonlyMap<number, InputCodec>>,
): void {
	if (!node.values || !ValuesNodeFactory.is(node.values) || !node.columns)
		return;
	const codecs = node.columns.map((column) => inputCodecs[column.column.name]);
	for (const row of node.values.values) {
		if (PrimitiveValueListNodeFactory.is(row)) {
			const rowCodecs = new Map<number, InputCodec>();
			for (const [index, codec] of codecs.entries()) {
				if (codec) rowCodecs.set(index, codec);
			}
			if (rowCodecs.size > 0) primitiveCodecs.set(row, rowCodecs);
			continue;
		}
		if (!ValueListNodeFactory.is(row)) continue;
		for (const [index, codec] of codecs.entries()) {
			markValue(row.values[index], codec, nodeCodecs, primitiveCodecs);
		}
	}
}

class InputCodecTransformer extends OperationNodeTransformer {
	private readonly nodeCodecs = new WeakMap<object, InputCodec>();
	private readonly primitiveCodecs = new WeakMap<
		object,
		ReadonlyMap<number, InputCodec>
	>();

	protected override transformInsertQuery(
		node: InsertQueryNode,
		queryId?: { readonly queryId: string },
	): InsertQueryNode {
		markInsertValues(node, this.nodeCodecs, this.primitiveCodecs);
		return super.transformInsertQuery(node, queryId);
	}

	protected override transformColumnUpdate(
		node: ColumnUpdateNode,
		queryId?: { readonly queryId: string },
	): ColumnUpdateNode {
		const codec = inputCodecs[getColumnName(node.column) ?? ""];
		markValue(node.value, codec, this.nodeCodecs, this.primitiveCodecs);
		return super.transformColumnUpdate(node, queryId);
	}

	protected override transformBinaryOperation(
		node: BinaryOperationNode,
		queryId?: { readonly queryId: string },
	): BinaryOperationNode {
		markValue(
			node.rightOperand,
			inputCodecs[getColumnName(node.leftOperand) ?? ""],
			this.nodeCodecs,
			this.primitiveCodecs,
		);
		markValue(
			node.leftOperand,
			inputCodecs[getColumnName(node.rightOperand) ?? ""],
			this.nodeCodecs,
			this.primitiveCodecs,
		);
		return super.transformBinaryOperation(node, queryId);
	}

	protected override transformValue(node: ValueNode): ValueNode {
		const codec = this.nodeCodecs.get(node);
		return codec
			? ValueNodeFactory.create(encodeTursoValue(codec, node.value))
			: node;
	}

	protected override transformPrimitiveValueList(
		node: PrimitiveValueListNode,
	): PrimitiveValueListNode {
		const codecs = this.primitiveCodecs.get(node);
		if (!codecs) return node;
		return PrimitiveValueListNodeFactory.create(
			node.values.map((value, index) => {
				const codec = codecs.get(index);
				return codec ? encodeTursoValue(codec, value) : value;
			}),
		);
	}
}

function decodeTimestamp(value: unknown): unknown {
	if (value === null) return value;
	if (value instanceof Date) {
		if (Number.isNaN(value.getTime()))
			throw new TypeError("Invalid SQLite timestamp");
		return value;
	}
	const milliseconds =
		typeof value === "number" || typeof value === "bigint"
			? Number(value)
			: typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value)
				? Number(value)
				: Number.NaN;
	const date = Number.isFinite(milliseconds)
		? new Date(milliseconds)
		: typeof value === "string"
			? new Date(value)
			: undefined;
	if (!date || Number.isNaN(date.valueOf())) {
		throw new TypeError("Invalid SQLite timestamp");
	}
	return date;
}

function decodeBoolean(value: unknown): unknown {
	if (value === null || typeof value === "boolean") return value;
	if (value === 0 || value === 0n || value === "0") return false;
	if (value === 1 || value === 1n || value === "1") return true;
	throw new TypeError("Invalid SQLite boolean");
}

function decodeJson(value: unknown, column: string): unknown {
	if (value === null || typeof value !== "string") return value;
	try {
		return JSON.parse(value);
	} catch (error) {
		throw new TypeError(`Invalid JSON in ${column}`, { cause: error });
	}
}

function decodeValue(
	codec: InputCodec,
	value: unknown,
	column: string,
): unknown {
	switch (codec) {
		case "timestamp":
			return decodeTimestamp(value);
		case "boolean":
			return decodeBoolean(value);
		case "json":
			return decodeJson(value, column);
		case "stringArray": {
			const decoded = decodeJson(value, column);
			if (
				!Array.isArray(decoded) ||
				!decoded.every((item) => typeof item === "string")
			) {
				throw new TypeError(`Invalid string[] in ${column}`);
			}
			return decoded;
		}
	}
}

export class TursoValueCodecPlugin implements KyselyPlugin {
	transformQuery({ node, queryId }: PluginTransformQueryArgs) {
		return new InputCodecTransformer().transformNode(node, queryId);
	}

	async transformResult({
		result,
	}: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
		return {
			...result,
			rows: result.rows.map((row) => {
				const decoded: UnknownRow = { ...row };
				for (const [column, codec] of resultCodecs) {
					if (column in decoded) {
						decoded[column] = decodeValue(codec, decoded[column], column);
					}
				}
				return decoded;
			}),
		};
	}
}
