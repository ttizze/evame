import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";

const schema = z.object({
	pageId: z.coerce.number().int().positive(),
	from: z.coerce.number().int().min(0),
	to: z.coerce.number().int().min(0),
	types: z
		.string()
		.optional()
		.transform((v) => (v ? v.split("~").filter(Boolean) : [])),
	userLocale: z.string(),
});

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const validation = schema.safeParse(Object.fromEntries(searchParams));
	if (!validation.success) {
		return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
	}

	const { pageId, from, to, types, userLocale } = validation.data;
	const fromNumber = Math.min(from, to);
	const toNumber = Math.max(from, to);
	if (toNumber - fromNumber > 10_000) {
		return NextResponse.json({ error: "Range too large" }, { status: 400 });
	}

	try {
		// 1) main segments in range
		const mainSegments = await db
			.selectFrom("segments")
			.select(["id", "number"])
			.where("contentId", "=", pageId)
			.where("number", ">=", fromNumber)
			.where("number", "<=", toNumber)
			.execute();

		if (mainSegments.length === 0) {
			return NextResponse.json({ byNumber: {} });
		}

		const mainIds = mainSegments.map((s) => s.id);
		const mainNumberById = new Map(mainSegments.map((s) => [s.id, s.number]));

		// 2) links (optionally filtered by annotation type label)
		let linksQuery = db
			.selectFrom("segmentAnnotationLinks as links")
			.innerJoin(
				"segments as annotationSeg",
				"links.annotationSegmentId",
				"annotationSeg.id",
			)
			.innerJoin(
				"segmentTypes as annotationType",
				"annotationSeg.segmentTypeId",
				"annotationType.id",
			)
			.select([
				"links.mainSegmentId as mainSegmentId",
				"links.annotationSegmentId as annotationSegmentId",
			])
			.distinct()
			.where("links.mainSegmentId", "in", mainIds);

		if (types.length > 0) {
			linksQuery = linksQuery.where("annotationType.label", "in", types);
		}

		const links = await linksQuery.execute();
		if (links.length === 0) {
			return NextResponse.json({ byNumber: {} });
		}

		const annotationIds = [...new Set(links.map((l) => l.annotationSegmentId))];

		// 3) fetch annotation segments with best translation for locale
		const annotationRows = await db
			.selectFrom("segments")
			.innerJoin("segmentTypes", "segments.segmentTypeId", "segmentTypes.id")
			.leftJoin(
				(eb) =>
					eb
						.selectFrom("segmentTranslations")
						.distinctOn("segmentTranslations.segmentId")
						.select([
							"segmentTranslations.id",
							"segmentTranslations.segmentId",
							"segmentTranslations.text",
							"segmentTranslations.locale",
							"segmentTranslations.point",
							"segmentTranslations.createdAt",
						])
						.where("segmentTranslations.locale", "=", userLocale)
						.orderBy("segmentTranslations.segmentId")
						.orderBy("segmentTranslations.point", "desc")
						.orderBy("segmentTranslations.createdAt", "desc")
						.as("trans"),
				(join) => join.onRef("trans.segmentId", "=", "segments.id"),
			)
			.select([
				"segments.id",
				"segments.number",
				"segments.text",
				"segmentTypes.key as typeKey",
				"segmentTypes.label as typeLabel",
				"trans.id as transId",
				"trans.text as transText",
			])
			.where("segments.id", "in", annotationIds)
			.execute();

		const annotationById = new Map(
			annotationRows.map((row) => [
				row.id,
				{
					id: row.id,
					number: row.number,
					text: row.text,
					segmentType: { key: row.typeKey, label: row.typeLabel },
					segmentTranslation: row.transId
						? { id: row.transId, text: row.transText ?? "" }
						: null,
				},
			]),
		);

		const byNumber: Record<
			number,
			Array<{
				id: number;
				number: number;
				text: string;
				segmentType: { key: string; label: string };
				segmentTranslation: { id: number; text: string } | null;
			}>
		> = {};

		for (const link of links) {
			const mainNumber = mainNumberById.get(link.mainSegmentId);
			if (mainNumber === undefined) continue;
			const annotation = annotationById.get(link.annotationSegmentId);
			if (!annotation) continue;
			const list = byNumber[mainNumber] ?? [];
			list.push(annotation);
			byNumber[mainNumber] = list;
		}

		return NextResponse.json({ byNumber });
	} catch (error) {
		console.error("Error fetching page annotations:", error);
		return NextResponse.json(
			{ error: "Failed to fetch annotations" },
			{ status: 500 },
		);
	}
}
