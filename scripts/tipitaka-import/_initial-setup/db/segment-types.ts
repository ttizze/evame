import { db } from "@/db";

const SEED_DATA = [
	{ key: "COMMENTARY" as const, label: "Atthakatha" },
	{ key: "COMMENTARY" as const, label: "Tika" },
];

export async function ensureSegmentTypes() {
	// skipDuplicates相当の処理: 既存のkey+labelを確認してから挿入
	for (const data of SEED_DATA) {
		const existing = await db
			.selectFrom("segmentTypes")
			.selectAll()
			.where("key", "=", data.key)
			.where("label", "=", data.label)
			.executeTakeFirst();
		if (!existing) {
			await db.insertInto("segmentTypes").values(data).execute();
		}
	}

	return db.selectFrom("segmentTypes").select(["key", "id", "label"]).execute();
}
