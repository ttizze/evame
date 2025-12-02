import type { SegmentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const SEED_DATA: Array<Pick<SegmentType, "key" | "label">> = [
	{ key: "COMMENTARY", label: "Atthakatha" },
	{ key: "COMMENTARY", label: "Tika" },
];

export async function ensureSegmentTypes() {
	await prisma.segmentType.createMany({
		data: SEED_DATA,
		skipDuplicates: true,
	});

	const labelMatchConditions = SEED_DATA.map((item) => ({
		key: item.key,
		label: item.label,
	}));

	return prisma.segmentType.findMany({
		where: { OR: labelMatchConditions },
		select: { key: true, id: true, label: true },
	});
}
