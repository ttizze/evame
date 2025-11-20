import type { PrismaClient, SegmentType } from "@prisma/client";

const SEED_DATA: Array<Pick<SegmentType, "key" | "label">> = [
	{ key: "PRIMARY", label: "Mula" },
	{ key: "COMMENTARY", label: "Atthakatha" },
	{ key: "COMMENTARY", label: "Tika" },
	{ key: "PRIMARY", label: "Other" },
];

export async function ensureSegmentTypes(prisma: PrismaClient) {
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
