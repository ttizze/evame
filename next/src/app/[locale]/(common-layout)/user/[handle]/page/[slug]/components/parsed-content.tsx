import type {
	AddTranslationFormTarget,
	VoteTarget,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import parse, {
	type HTMLReactParserOptions,
	domToReact,
	type DOMNode,
} from "html-react-parser";
import DOMPurify from "isomorphic-dompurify";
import Image from "next/image";
import { memo } from "react";
import type { SegmentWithTranslations } from "../types";
import { SegmentAndTranslationSection } from "./segment-and-translation-section";
interface ParsedContentProps {
	html: string;
	segmentWithTranslations: SegmentWithTranslations[] | null;
	currentHandle: string | undefined;
	locale: string;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
}

export const MemoizedParsedContent = memo(ParsedContent);

export function ParsedContent({
	html,
	segmentWithTranslations,
	currentHandle,
	locale,
	voteTarget,
	addTranslationFormTarget,
}: ParsedContentProps) {
	const sanitizedContent = DOMPurify.sanitize(html);

	const options: HTMLReactParserOptions = {
		replace: (domNode) => {
			if (domNode.type === "tag" && domNode.attribs["data-number-id"]) {
				const number = Number(domNode.attribs["data-number-id"]);
				const segmentWithTranslation = segmentWithTranslations?.find(
					(info) => info.segment.number === number,
				);
				if (!segmentWithTranslation) {
					return null;
				}
				const DynamicTag = domNode.name as keyof React.JSX.IntrinsicElements;
				const { class: className, ...otherAttribs } = domNode.attribs;
				return (
					<DynamicTag {...otherAttribs} className={className}>
						<SegmentAndTranslationSection
							key={`translation-${number}`}
							segmentWithTranslations={segmentWithTranslation}
							elements={domToReact(domNode.children as DOMNode[], options)}
							currentHandle={currentHandle}
							voteTarget={voteTarget}
							addTranslationFormTarget={addTranslationFormTarget}
						/>
					</DynamicTag>
				);
			}
			if (domNode.type === "tag" && domNode.name === "img") {
				const { src, alt, width, height, ...otherAttribs } = domNode.attribs;
				return (
					<Image
						src={src}
						alt={alt || ""}
						height={height ? Number(height) : 300}
						width={width ? Number(width) : 300}
						sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
						className="w-auto h-auto max-w-full"
						priority={false}
						{...otherAttribs}
					/>
				);
			}
			return domNode;
		},
	};

	return parse(sanitizedContent, options);
}
