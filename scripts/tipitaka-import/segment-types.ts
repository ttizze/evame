import type { PrismaClient, SegmentType } from "@prisma/client";

const SEED_DATA: Array<Pick<SegmentType, "key" | "label" | "weight">> = [
	{ key: "MULA", label: "Mula", weight: 10 },
	{ key: "ATTHAKATHA", label: "Atthakatha", weight: 20 },
	{ key: "TIKA", label: "Tika", weight: 30 },
	{ key: "OTHER", label: "Other", weight: 40 },
];

const TARGET_KEYS = ["PRIMARY", ...SEED_DATA.map((item) => item.key)];

export async function ensureSegmentTypes(prisma: PrismaClient) {
	await prisma.segmentType.createMany({
		data: SEED_DATA,
		skipDuplicates: true,
	});

	return prisma.segmentType.findMany({
		where: { key: { in: TARGET_KEYS } },
		select: { key: true, id: true },
	});
}
