import type { SegmentType } from "@prisma/client";
import { prisma } from "@/tests/prisma";

const SEED_DATA: Array<Pick<SegmentType, "key" | "label">> = [
	{ key: "COMMENTARY", label: "Atthakatha" },
	{ key: "COMMENTARY", label: "Tika" },
];

export async function ensureSegmentTypes() {
	await prisma.segmentType.createMany({
		data: SEED_DATA,
		skipDuplicates: true,
	});

	return prisma.segmentType.findMany({
		select: { key: true, id: true, label: true },
	});
}
