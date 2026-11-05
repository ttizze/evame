import {
	ColumnNode,
	ColumnUpdateNode,
	type InsertQueryNode,
	type KyselyPlugin,
	type OnConflictNode,
	OperationNodeTransformer,
	type PluginTransformQueryArgs,
	type PluginTransformResultArgs,
	PrimitiveValueListNode,
	TableNode,
	type UpdateQueryNode,
	ValueListNode,
	ValueNode,
	ValuesNode,
} from "kysely";

// SQLiteのLIKEはASCII以外の大小文字を畳み込まないため、保存時にUnicodeを正規化する。
export const searchColumns: Record<string, { source: string; stored: string }> =
	{
		segments: { source: "text", stored: "search_text" },
		tags: { source: "name", stored: "search_name" },
		users: { source: "name", stored: "search_name" },
	};

function searchUpdates(
	updates: readonly ColumnUpdateNode[],
	column: { source: string; stored: string },
) {
	const update = updates.find(
		(item) =>
			ColumnNode.is(item.column) && item.column.column.name === column.source,
	);
	if (!update) return updates;
	const value = update.value;
	if (!value || !ValueNode.is(value) || typeof value.value !== "string")
		throw new Error("Searchable fields must be updated with text values");
	return [
		...updates,
		ColumnUpdateNode.create(
			ColumnNode.create(column.stored),
			ValueNode.create(value.value.toLowerCase()),
		),
	];
}

class SearchValueTransformer extends OperationNodeTransformer {
	private readonly conflicts = new WeakMap<
		OnConflictNode,
		{ source: string; stored: string }
	>();
	protected override transformInsertQuery(
		node: InsertQueryNode,
	): InsertQueryNode {
		const column = node.into && searchColumns[node.into.table.identifier.name];
		if (!column || !node.columns || !node.values || !ValuesNode.is(node.values))
			return super.transformInsertQuery(node);
		const index = node.columns.findIndex(
			(item) => item.column.name === column.source,
		);
		if (index < 0) return super.transformInsertQuery(node);
		if (node.onConflict) this.conflicts.set(node.onConflict, column);
		const values = node.values.values.map((row) => {
			if (PrimitiveValueListNode.is(row)) {
				const source = row.values[index];
				if (typeof source !== "string")
					throw new Error("Searchable fields must contain text");
				return PrimitiveValueListNode.create([
					...row.values,
					source.toLowerCase(),
				]);
			}
			const source = row.values[index];
			if (!ValueNode.is(source) || typeof source.value !== "string")
				throw new Error("Searchable fields must contain text");
			return ValueListNode.create([
				...row.values,
				ValueNode.create(source.value.toLowerCase()),
			]);
		});
		return super.transformInsertQuery({
			...node,
			columns: [...node.columns, ColumnNode.create(column.stored)],
			values: ValuesNode.create(values),
		});
	}
	protected override transformUpdateQuery(
		node: UpdateQueryNode,
	): UpdateQueryNode {
		const column =
			node.table &&
			TableNode.is(node.table) &&
			searchColumns[node.table.table.identifier.name];
		return super.transformUpdateQuery(
			column && node.updates
				? { ...node, updates: searchUpdates(node.updates, column) }
				: node,
		);
	}
	protected override transformOnConflict(node: OnConflictNode): OnConflictNode {
		const column = this.conflicts.get(node);
		return super.transformOnConflict(
			column && node.updates
				? { ...node, updates: searchUpdates(node.updates, column) }
				: node,
		);
	}
}

export class SearchValuesPlugin implements KyselyPlugin {
	transformQuery({ node, queryId }: PluginTransformQueryArgs) {
		return new SearchValueTransformer().transformNode(node, queryId);
	}
	async transformResult({ result }: PluginTransformResultArgs) {
		return {
			...result,
			rows: result.rows.map(
				({ searchText: _text, searchName: _name, ...row }) => row,
			),
		};
	}
}
