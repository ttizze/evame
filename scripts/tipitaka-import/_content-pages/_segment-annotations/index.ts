export { getSegmentsForContent } from "./application/get-segments-for-content";
export { linkAnnotationSegments } from "./application/link-annotation-segments";
export type { SegmentRecord } from "./db/segments";
export {
	buildParagraphAnchorMap,
	type ParagraphAnchorMap,
} from "./domain/build-paragraph-anchor-map";
export {
	buildParagraphSegmentMap,
	type ParagraphSegmentMap,
} from "./domain/build-paragraph-segment-map";
export { extractFirstParagraphNumber } from "./domain/extract-first-paragraph-number";
