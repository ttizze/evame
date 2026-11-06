import { CompiledQuery } from "kysely";
import { beforeEach, expect, it } from "vitest";
import { databaseScope, db } from "@/db";
import { resetDatabase } from "@/tests/db-helpers";
import {
	createPage,
	createPageWithSegments,
	createUser,
} from "@/tests/factories";
import { setupDbPerFile } from "@/tests/test-db-manager";
import { queryChildPagesTree } from "./queries";

await setupDbPerFile(import.meta.url);
beforeEach(resetDatabase);

it("子記事ツリーは全段落を走査せず、対象記事のタイトルだけを取得する", async () => {
	const owner = await createUser();
	const parent = await createPage({ userId: owner.id, slug: "parent" });
	const child = await createPageWithSegments({
		userId: owner.id,
		slug: "child",
		segments: [
			{ number: 0, text: "子記事", textAndOccurrenceHash: "child-title" },
		],
	});
	await db
		.updateTable("pages")
		.set({ parentId: parent.id })
		.where("id", "=", child.id)
		.execute();
	const statements: CompiledQuery[] = [];
	const executor = db.getExecutor();
	const observed = db.withPlugin({
		transformQuery(args) {
			statements.push(executor.compileQuery(args.node, args.queryId));
			return args.node;
		},
		async transformResult({ result }) {
			return result;
		},
	});
	const tree = await databaseScope.run(observed, () =>
		queryChildPagesTree(parent.id, "ja"),
	);
	expect(tree).toMatchObject([
		{
			id: child.id,
			titleText: "子記事",
			titleTranslationText: null,
			children: [],
		},
	]);
	const treeQueries = statements.filter(({ sql }) =>
		sql.startsWith("with recursive"),
	);
	expect(treeQueries).toHaveLength(1);
	for (const query of treeQueries) {
		const plan = await db.executeQuery<{ detail: string }>(
			CompiledQuery.raw(`EXPLAIN QUERY PLAN ${query.sql}`, [
				...query.parameters,
			]),
		);
		expect(
			plan.rows.filter(({ detail }) => /^SCAN segments\b/i.test(detail)),
		).toEqual([]);
	}
});
