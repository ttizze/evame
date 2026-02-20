import { json, type RequestHandler } from "@sveltejs/kit";
import { z } from "zod";
import type { LikeState } from "@/app/api/page-likes/_types/like-state";
import { db } from "@/db";

export const GET: RequestHandler = async ({ locals, url }) => {
	const idsParam = url.searchParams.get("ids");
	const ids =
		z
			.string()
			.transform((value) =>
				value
					.split(",")
					.map((id) => Number.parseInt(id, 10))
					.filter((id) => Number.isFinite(id)),
			)
			.optional()
			.catch([])
			.parse(idsParam) ?? [];

	if (ids.length === 0) {
		return json({ states: {} });
	}

	const likeCountRows = await db
		.selectFrom("likePages")
		.select(["pageId", db.fn.countAll<number>().as("count")])
		.where("pageId", "in", ids)
		.groupBy("pageId")
		.execute();

	const likeCountMap = new Map(
		likeCountRows.map((row) => [row.pageId, Number(row.count ?? 0)]),
	);

	const likedRows = locals.user?.id
		? await db
				.selectFrom("likePages")
				.select("pageId")
				.where("userId", "=", locals.user.id)
				.where("pageId", "in", ids)
				.execute()
		: [];

	const likedSet = new Set(likedRows.map((row) => row.pageId));
	const states: Record<string, LikeState> = {};
	for (const id of ids) {
		states[String(id)] = {
			liked: likedSet.has(id),
			likeCount: likeCountMap.get(id) ?? 0,
		};
	}

	return json({ states });
};
