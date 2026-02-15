import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { db } from "@/db";
import type { JsonValue, PageStatus } from "@/db/types";

export async function upsertPageForSync(params: {
	userId: string;
	slug: string;
	existingPageId: number | undefined;
	mdastJson: JsonValue;
	segments: Parameters<typeof syncSegments>[2];
	publishedAt: Date | null;
	status: PageStatus;
}) {
	return await db.transaction().execute(async (tx) => {
		if (params.existingPageId !== undefined) {
			await tx
				.updateTable("pages")
				.set({
					mdastJson: params.mdastJson,
					status: params.status,
					publishedAt: params.publishedAt,
				})
				.where("id", "=", params.existingPageId)
				.execute();

			await syncSegments(tx, params.existingPageId, params.segments, null);
			return { created: false };
		}

		const content = await tx
			.insertInto("contents")
			.values({ kind: "PAGE" })
			.returning(["id"])
			.executeTakeFirstOrThrow();

		await tx
			.insertInto("pages")
			.values({
				id: content.id,
				slug: params.slug,
				userId: params.userId,
				mdastJson: params.mdastJson,
				sourceLocale: "ja",
				status: params.status,
				publishedAt: params.publishedAt,
			})
			.execute();

		await syncSegments(tx, content.id, params.segments, null);
		return { created: true };
	});
}
