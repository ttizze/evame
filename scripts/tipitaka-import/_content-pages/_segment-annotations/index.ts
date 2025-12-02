export {
	buildParagraphSegmentMap,
	type ParagraphSegmentMap,
} from "../domain/paragraph-segments/build-paragraph-segment-map";
export { linkAnnotationSegments } from "./application/link-annotation-segments";
export type { SegmentRecord } from "./db/segments";
export { findSegmentsByContentId } from "./db/segments";
export {
	buildParagraphAnchorMap,
	type ParagraphAnchorMap,
} from "./domain/build-paragraph-anchor-map";
export { extractFirstParagraphNumber } from "./domain/extract-first-paragraph-number";
