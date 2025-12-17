import { db } from "@/db";

const METADATA_TYPE_SEED_DATA = [
	{ key: "VRI_PAGEBREAK", label: "VRI Page Break" },
	{ key: "PTS_PAGEBREAK", label: "PTS Page Break" },
	{ key: "THAI_PAGEBREAK", label: "Thai Page Break" },
	{ key: "MYANMAR_PAGEBREAK", label: "Myanmar Page Break" },
	{ key: "OTHER_PAGEBREAK", label: "Other Page Break" },
];

export async function ensureMetadataTypes() {
	// skipDuplicates相当の処理: 既存のkeyを確認してから挿入
	for (const data of METADATA_TYPE_SEED_DATA) {
		const existing = await db
			.selectFrom("segmentMetadataTypes")
			.selectAll()
			.where("key", "=", data.key)
			.executeTakeFirst();
		if (!existing) {
			await db.insertInto("segmentMetadataTypes").values(data).execute();
		}
	}

	return db
		.selectFrom("segmentMetadataTypes")
		.select(["key", "id"])
		.where(
			"key",
			"in",
			METADATA_TYPE_SEED_DATA.map((item) => item.key),
		)
		.execute();
}
