import { eq, inArray } from "drizzle-orm";
import { db } from "@/drizzle";
import { segmentMetadataTypes } from "@/drizzle/schema";
import type { SegmentMetadataType } from "@/drizzle/types";

const METADATA_TYPE_SEED_DATA: Array<
	Pick<SegmentMetadataType, "key" | "label">
> = [
	{ key: "VRI_PAGEBREAK", label: "VRI Page Break" },
	{ key: "PTS_PAGEBREAK", label: "PTS Page Break" },
	{ key: "THAI_PAGEBREAK", label: "Thai Page Break" },
	{ key: "MYANMAR_PAGEBREAK", label: "Myanmar Page Break" },
	{ key: "OTHER_PAGEBREAK", label: "Other Page Break" },
];

export async function ensureMetadataTypes() {
	// skipDuplicates相当の処理: 既存のkeyを確認してから挿入
	for (const data of METADATA_TYPE_SEED_DATA) {
		const [existing] = await db
			.select()
			.from(segmentMetadataTypes)
			.where(eq(segmentMetadataTypes.key, data.key))
			.limit(1);
		if (!existing) {
			await db.insert(segmentMetadataTypes).values(data);
		}
	}

	return db
		.select({
			key: segmentMetadataTypes.key,
			id: segmentMetadataTypes.id,
		})
		.from(segmentMetadataTypes)
		.where(
			inArray(
				segmentMetadataTypes.key,
				METADATA_TYPE_SEED_DATA.map((item) => item.key),
			),
		);
}
