import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SegmentForRender } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment-for-render";
import { fetchPageSection } from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_service/fetch-page.server";
import type { PageSectionsOkResponse } from "./types";

export async function GET(req: NextRequest) {
	const Params = z.object({
		slug: z.string().min(1),
		locale: z.string().min(1),
		section: z.coerce.number().int().min(0),
	});

	const { slug, locale, section } = Params.parse(
		Object.fromEntries(req.nextUrl.searchParams),
	);

	const sectionDetail = await fetchPageSection(slug, locale, section);
	if (!sectionDetail) {
		return NextResponse.json({ error: "not_found" }, { status: 404 });
	}

	const response: PageSectionsOkResponse = {
		mdastJson: sectionDetail.mdastJson,
		segments: sectionDetail.content.segments.map(
			(s): SegmentForRender => ({
				id: s.id,
				number: s.number,
				text: s.text ?? "",
				segmentTranslation: s.segmentTranslation
					? {
							id: s.segmentTranslation.id,
							text: s.segmentTranslation.text ?? "",
						}
					: null,
				annotations: Array.isArray(s.annotations)
					? s.annotations.map((link) => {
							const a = link.annotationSegment;
							return {
								annotationSegment: {
									id: a.id,
									number: a.number,
									text: a.text ?? "",
									segmentTranslation: a.segmentTranslation
										? {
												id: a.segmentTranslation.id,
												text: a.segmentTranslation.text ?? "",
											}
										: null,
									segmentType: a.segmentType
										? { label: a.segmentType.label ?? null }
										: null,
								},
							};
						})
					: [],
			}),
		),
		section: sectionDetail.section,
		hasMore: sectionDetail.hasMoreSections,
		totalSections: sectionDetail.totalSections,
	};
	return NextResponse.json(response);
}
