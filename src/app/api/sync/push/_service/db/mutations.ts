import { notifyPagePublication } from "@/app/_service/notify-page-publication";
import { syncSegments } from "@/app/[locale]/_service/sync-segments";
import { runTransaction } from "@/db/transaction";
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
	return await runTransaction(async (tx) => {
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

			await syncSegments(tx, params.existingPageId, params.segments);
			await notifyPagePublication(tx, params.existingPageId);
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

		await syncSegments(tx, content.id, params.segments);
		await notifyPagePublication(tx, content.id);
		return { created: true };
	});
}
