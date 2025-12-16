import { and, eq } from "drizzle-orm";
import { db } from "@/drizzle";
import { segmentTypes } from "@/drizzle/schema";
import type { SegmentType } from "@/drizzle/types";

const SEED_DATA: Array<Pick<SegmentType, "key" | "label">> = [
	{ key: "COMMENTARY", label: "Atthakatha" },
	{ key: "COMMENTARY", label: "Tika" },
];

export async function ensureSegmentTypes() {
	// skipDuplicates相当の処理: 既存のkey+labelを確認してから挿入
	for (const data of SEED_DATA) {
		const [existing] = await db
			.select()
			.from(segmentTypes)
			.where(
				and(eq(segmentTypes.key, data.key), eq(segmentTypes.label, data.label)),
			)
			.limit(1);
		if (!existing) {
			await db.insert(segmentTypes).values(data);
		}
	}

	return db
		.select({
			key: segmentTypes.key,
			id: segmentTypes.id,
			label: segmentTypes.label,
		})
		.from(segmentTypes);
}
