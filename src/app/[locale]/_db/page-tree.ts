import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SqlExecutor } from "@/db/turso-types";
import { getDatabase } from "@/server/runtime";
import {
	listChildScriptures,
	type ScriptureTreeNode,
} from "@/server/scripture-tree";

export type PageForTitleTree = ScriptureTreeNode;

/** 公開scriptureの子孫を、旧詳細画面の階層表示用に取得する。 */
export function fetchChildPagesTree(
	parentId: number,
	locale: string,
	database: SqlExecutor = getDatabase(),
): Promise<PageForTitleTree[]> {
	return listChildScriptures(database, { parentId, locale });
}

export const getChildPages = createServerFn({ method: "GET" })
	.validator(
		z.object({
			parentId: z.number().int().positive(),
			locale: z.string().min(2),
		}),
	)
	.handler(({ data }) =>
		listChildScriptures(getDatabase(), {
			parentId: data.parentId,
			locale: data.locale,
		}),
	);
