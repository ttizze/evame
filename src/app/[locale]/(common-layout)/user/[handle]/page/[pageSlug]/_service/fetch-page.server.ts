import {
	addAnnotations,
	countSegmentsBySlug,
	fetchAllSegmentsByPageId,
	fetchCounts,
	fetchPageBasicBySlug,
	fetchPageSectionSourceBySlug,
	fetchSegmentsByNumbers,
	fetchTags,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_db/fetch-page-detail.server";
import {
	collectSegmentNumbersFromMdast,
	sliceMdastSectionBySegmentCount,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[pageSlug]/_domain/mdast-sections";

const MIN_TOTAL_SEGMENTS_TO_ENABLE_SPLIT = 500;
const TARGET_SECTION_SEGMENTS = 100;

/**
 * 本体ページ（SSR）のための取得。
 *
 * - まず totalSegments から「分割するか」を決める（ポリシー）
 * - 短いページ: 全文を返す（`fetchPageAllSection`）
 * - 長いページ: section=0 のみ返す（続きは `fetchPageSection` / `/api/page-sections`）
 */
export async function fetchPage(slug: string, locale: string) {
	const totalSegments = await countSegmentsBySlug(slug);
	const shouldSplit = totalSegments >= MIN_TOTAL_SEGMENTS_TO_ENABLE_SPLIT;

	if (!shouldSplit) {
		return await fetchPageAllSection(slug, locale);
	}

	return await fetchPageFirstSection(slug, locale);
}

export async function fetchPageAllSection(slug: string, locale: string) {
	const page = await fetchPageBasicBySlug(slug);

	if (!page) return null;

	const [tags, counts, segments] = await Promise.all([
		fetchTags(page.id),
		fetchCounts(page.id),
		fetchAllSegmentsByPageId(page.id, locale),
	]);

	const segmentsWithAnnotations = await addAnnotations(
		segments,
		page.id,
		locale,
	);

	return {
		id: page.id,
		slug: page.slug,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
		status: page.status,
		sourceLocale: page.sourceLocale,
		parentId: page.parentId,
		order: page.order,
		mdastJson: page.mdastJson,
		user: page.user,
		tagPages: tags,
		_count: counts,
		section: 0,
		totalSections: 1,
		hasMoreSections: false,
		content: {
			segments: segmentsWithAnnotations,
		},
	};
}

async function fetchPageFirstSection(slug: string, locale: string) {
	const page = await fetchPageBasicBySlug(slug);
	if (!page) return null;

	const {
		mdast: mdastJson,
		totalSections,
		hasMore,
	} = sliceMdastSectionBySegmentCount(
		page.mdastJson,
		0,
		TARGET_SECTION_SEGMENTS,
	);

	const segmentNumbers = collectSegmentNumbersFromMdast(mdastJson);
	if (!segmentNumbers.includes(0)) {
		segmentNumbers.unshift(0);
	}

	const [tags, counts, segments] = await Promise.all([
		fetchTags(page.id),
		fetchCounts(page.id),
		fetchSegmentsByNumbers(page.id, locale, segmentNumbers),
	]);

	const segmentsWithAnnotations = await addAnnotations(
		segments,
		page.id,
		locale,
	);

	return {
		id: page.id,
		slug: page.slug,
		createdAt: page.createdAt,
		updatedAt: page.updatedAt,
		status: page.status,
		sourceLocale: page.sourceLocale,
		parentId: page.parentId,
		order: page.order,
		mdastJson,
		user: page.user,
		tagPages: tags,
		_count: counts,
		section: 0,
		totalSections,
		hasMoreSections: hasMore,
		content: {
			segments: segmentsWithAnnotations,
		},
	};
}

/**
 * 無限スクロール用の section 取得
 *
 * - 本体ページが返す section=0 の続き（section=1..）を取得する
 * - title（`number=0`）は返さない（本体ページの初期表示でのみ使用）
 */
export async function fetchPageSection(
	slug: string,
	locale: string,
	section: number,
) {
	const page = await fetchPageSectionSourceBySlug(slug);
	if (!page) return null;

	const {
		mdast: mdastJson,
		totalSections,
		hasMore,
	} = sliceMdastSectionBySegmentCount(
		page.mdastJson,
		section,
		TARGET_SECTION_SEGMENTS,
	);

	const segmentNumbers = collectSegmentNumbersFromMdast(mdastJson);

	const segments = await fetchSegmentsByNumbers(
		page.id,
		locale,
		segmentNumbers,
	);
	const segmentsWithAnnotations = await addAnnotations(
		segments,
		page.id,
		locale,
	);

	return {
		mdastJson,
		section,
		totalSections,
		hasMoreSections: hasMore,
		content: {
			segments: segmentsWithAnnotations,
		},
	};
}
