import type { SqlExecutor } from "../db/turso-types";
import { InvalidInputError } from "../domain/errors";
import { parsePositiveId, parseSupportedLocale } from "../domain/vote";

export type ScriptureTreeNode = {
	id: number;
	slug: string;
	title: string;
	parentId: number | null;
	position: number;
	ownerHandle: string;
	href: string;
	children: ScriptureTreeNode[];
};

type ScriptureTreeRow = {
	id: number;
	slug: string;
	title: string;
	parent_id: number | null;
	position: number;
	owner_handle: string;
};

function parseParentId(value: unknown): number {
	return parsePositiveId(value, "parentId");
}

function buildTree(
	rows: readonly ScriptureTreeRow[],
	locale: string,
	parentId: number,
): ScriptureTreeNode[] {
	const nodes = new Map<number, ScriptureTreeNode>();
	for (const row of rows) {
		nodes.set(row.id, {
			id: row.id,
			slug: row.slug,
			title: row.title.trim() || row.slug,
			parentId: row.parent_id,
			position: row.position,
			ownerHandle: row.owner_handle,
			href: `/${locale}/${row.owner_handle}/${row.slug}`,
			children: [],
		});
	}

	const roots: ScriptureTreeNode[] = [];
	for (const node of nodes.values()) {
		const parent =
			node.parentId === null ? undefined : nodes.get(node.parentId);
		if (parent) parent.children.push(node);
		else if (node.parentId === parentId) roots.push(node);
	}

	const sort = (left: ScriptureTreeNode, right: ScriptureTreeNode) =>
		left.position - right.position || left.id - right.id;
	const sortChildren = (node: ScriptureTreeNode) => {
		node.children.sort(sort);
		for (const child of node.children) sortChildren(child);
	};
	roots.sort(sort);
	for (const root of roots) sortChildren(root);
	return roots;
}

/** 公開済みscriptureの子孫を、旧詳細画面用の折りたたみツリーへ変換する。 */
export async function listChildScriptures(
	db: SqlExecutor,
	input: unknown,
): Promise<ScriptureTreeNode[]> {
	if (typeof input !== "object" || input === null || Array.isArray(input)) {
		throw new InvalidInputError("経典階層の入力が不正です");
	}
	const value = input as Record<string, unknown>;
	const parentId = parseParentId(value.parentId);
	const locale = parseSupportedLocale(value.locale);
	const rows = await db.all<ScriptureTreeRow>(
		`WITH RECURSIVE descendants AS (
			SELECT id, slug, title, parent_id, position, owner_user_id
			FROM scriptures
			WHERE parent_id = ? AND published_at IS NOT NULL
			UNION ALL
			SELECT child.id, child.slug, child.title, child.parent_id,
				child.position, child.owner_user_id
			FROM scriptures AS child
			INNER JOIN descendants AS parent ON parent.id = child.parent_id
			WHERE child.published_at IS NOT NULL
		)
		SELECT descendants.id, descendants.slug, descendants.title,
			descendants.parent_id, descendants.position,
			users.handle AS owner_handle
		FROM descendants
		INNER JOIN users ON users.id = descendants.owner_user_id
		ORDER BY descendants.position, descendants.id`,
		[parentId],
	);

	for (const row of rows) {
		if (
			!Number.isSafeInteger(row.id) ||
			!Number.isSafeInteger(row.position) ||
			typeof row.slug !== "string" ||
			typeof row.title !== "string" ||
			typeof row.owner_handle !== "string"
		) {
			throw new InvalidInputError("経典階層の行が不正です");
		}
	}

	return buildTree(rows, locale, parentId);
}
