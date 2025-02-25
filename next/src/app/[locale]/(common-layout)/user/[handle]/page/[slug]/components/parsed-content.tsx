import type {
	AddTranslationFormTarget,
	VoteTarget,
} from "@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/constants";
import type { SegmentWithTranslations } from "@/app/[locale]/types";
import parse, {
	type HTMLReactParserOptions,
	domToReact,
	type DOMNode,
} from "html-react-parser";
import DOMPurify from "isomorphic-dompurify";
import { customAlphabet } from "nanoid";
import Image from "next/image";
import { memo } from "react";
import { SegmentAndTranslationSection } from "./segment-and-translation-section";
interface ParsedContentProps {
	html: string;
	segmentWithTranslations: SegmentWithTranslations[] | null;
	currentHandle: string | undefined;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
}

export const MemoizedParsedContent = memo(ParsedContent);

export function ParsedContent({
	html,
	segmentWithTranslations,
	currentHandle,
	voteTarget,
	addTranslationFormTarget,
}: ParsedContentProps) {
	const sanitizedContent = DOMPurify.sanitize(html);

	const options: HTMLReactParserOptions = {
		replace: (domNode) => {
			if (domNode.type === "tag" && /^h[1-6]$/.test(domNode.name)) {
				// 既に id が存在するかチェック
				if (!domNode.attribs.id) {
					const ALPHABET =
						"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
					const uuid = customAlphabet(ALPHABET, 8)();
					domNode.attribs.id = uuid;
				}
			}
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
						className="w-auto h-auto max-w-full"
						priority={false}
						{...otherAttribs}
					/>
				);
			}
			return domNode;
		},
	};
	return <span className="js-content">{parse(sanitizedContent, options)}</span>;
}
