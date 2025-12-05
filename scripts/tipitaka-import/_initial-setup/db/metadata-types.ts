import type { SegmentMetadataType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
	await prisma.segmentMetadataType.createMany({
		data: METADATA_TYPE_SEED_DATA,
		skipDuplicates: true,
	});

	return prisma.segmentMetadataType.findMany({
		where: { key: { in: METADATA_TYPE_SEED_DATA.map((item) => item.key) } },
		select: { key: true, id: true },
	});
}
