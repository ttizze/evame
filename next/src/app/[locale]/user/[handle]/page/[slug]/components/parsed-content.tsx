"use client";
import type {
	AddTranslationFormTarget,
	VoteTarget,
} from "@/app/[locale]/user/[handle]/page/[slug]/constants";
import parse, {
	type HTMLReactParserOptions,
	domToReact,
	type DOMNode,
} from "html-react-parser";
import DOMPurify from "isomorphic-dompurify";
import { memo } from "react";
import type { SegmentWithTranslations } from "../types";
import { SegmentAndTranslationSection } from "./segment-and-translation-section";

interface ParsedContentProps {
	html: string;
	segmentWithTranslations: SegmentWithTranslations[] | null;
	currentHandle: string | undefined;
	showOriginal: boolean;
	showTranslation: boolean;
	locale: string;
	voteTarget: VoteTarget;
	addTranslationFormTarget: AddTranslationFormTarget;
}

export const MemoizedParsedContent = memo(ParsedContent);

export function ParsedContent({
	html,
	segmentWithTranslations,
	showOriginal = true,
	showTranslation = true,
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
							showOriginal={showOriginal}
							showTranslation={showTranslation}
							currentHandle={currentHandle}
							voteTarget={voteTarget}
							addTranslationFormTarget={addTranslationFormTarget}
						/>
					</DynamicTag>
				);
			}
			if (domNode.type === "tag" && domNode.name === "a") {
				const originalHref = domNode.attribs.href ?? "";

				// http:// or https:// で始まっていれば外部リンクとみなす
				const isExternalLink = /^https?:\/\//.test(originalHref);

				// ロケールを付けるかどうかを分岐
				let localizedHref: string;
				if (!isExternalLink) {
					// 外部リンクでなければ /{locale} を先頭に付ける
					// 例) /foo/bar → /ja/foo/bar
					localizedHref = `/${locale}${originalHref.startsWith("/") ? "" : "/"}${originalHref}`;
				} else {
					// 外部リンクの場合はそのまま
					localizedHref = originalHref;
				}

				return (
					<a href={localizedHref} className="underline underline-offset-4 ">
						{domToReact(domNode.children as DOMNode[], options)}
					</a>
				);
			}
			if (domNode.type === "tag" && domNode.name === "img") {
				const { src, alt, width, height, ...otherAttribs } = domNode.attribs;
				return (
					//otherAttribs がbiomeのlintに引っかかる
					// biome-ignore lint/a11y/useAltText: <explanation>
					<img
						src={src}
						alt={alt || ""}
						height={height || "auto"}
						className="aspect-ratio-img max-w-full"
						{...otherAttribs}
					/>
				);
			}
			return domNode;
		},
	};

	return parse(sanitizedContent, options);
}
