import { z } from "zod";
import { getCurrentUserFromHeaders } from "@/app/_service/current-user";
import { PRIVATE_RESPONSE_HEADERS } from "@/app/api/_utils/private-response-headers";
import type { LikeState } from "@/app/api/page-likes/_types/like-state";
import { db } from "@/db";

export async function getPageLikeStates(request: Request): Promise<Response> {
	const { searchParams } = new URL(request.url);
	const idsParam = searchParams.get("ids");
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
		return Response.json({ states: {} }, { headers: PRIVATE_RESPONSE_HEADERS });
	}

	const currentUser = await getCurrentUserFromHeaders(request.headers);
	const likeCountRows = await db
		.selectFrom("likePages")
		.select(["pageId", db.fn.countAll<number>().as("count")])
		.where("pageId", "in", ids)
		.groupBy("pageId")
		.execute();

	const likeCountMap = new Map(
		likeCountRows.map((row) => [row.pageId, Number(row.count ?? 0)]),
	);

	const likedRows = currentUser?.id
		? await db
				.selectFrom("likePages")
				.select("pageId")
				.where("userId", "=", currentUser.id)
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

	return Response.json({ states }, { headers: PRIVATE_RESPONSE_HEADERS });
}
