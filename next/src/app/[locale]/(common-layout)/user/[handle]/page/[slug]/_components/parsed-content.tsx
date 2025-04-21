import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import type { SegmentBundle } from "@/app/[locale]/types";
import parse, { type HTMLReactParserOptions } from "html-react-parser";
import DOMPurify from "isomorphic-dompurify";
import { customAlphabet } from "nanoid";
import Image from "next/image";
import { memo } from "react";
import { Tweet as XPost } from "react-tweet";
interface ParsedContentProps {
	html: string;
	segmentBundles: SegmentBundle[] | null;
	currentHandle: string | undefined;
}

export const MemoizedParsedContent = memo(ParsedContent);

export function ParsedContent({
	html,
	segmentBundles,
	currentHandle,
}: ParsedContentProps) {
	const sanitizedContent = DOMPurify.sanitize(html, {
		ADD_ATTR: ["xid", "data-type"], // ← 追加
	});

	const options: HTMLReactParserOptions = {
		replace: (domNode) => {
			//TOCのためのidを生成
			if (domNode.type === "tag" && /^h[1-6]$/.test(domNode.name)) {
				// 既に id が存在するかチェック
				if (!domNode.attribs.id) {
					const ALPHABET =
						"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
					const uuid = customAlphabet(ALPHABET, 8)();
					domNode.attribs.id = uuid;
				}
			}
			/* ---------- X (旧 Twitter) ポスト ---------- */
			if (
				domNode.type === "tag" &&
				domNode.name === "div" &&
				domNode.attribs["data-type"] === "x"
			) {
				const xId = domNode.attribs.xid;
				if (!xId) return null;
				return (
					<div data-type="x" data-x-id={xId} className="not-prose">
						<XPost id={xId} />
					</div>
				);
			}
			// セグメントの翻訳が存在する場合は、セグメントの翻訳を表示
			if (domNode.type === "tag" && domNode.attribs["data-number-id"]) {
				const number = Number(domNode.attribs["data-number-id"]);
				const segmentBundle = segmentBundles?.find(
					(info) => info.segment.number === number,
				);
				if (!segmentBundle) {
					return null;
				}
				const DynamicTag = domNode.name as keyof React.JSX.IntrinsicElements;
				const { class: className, ...otherAttribs } = domNode.attribs;
				return (
					<DynamicTag {...otherAttribs} className={className}>
						<SegmentAndTranslationSection
							key={`translation-${number}`}
							segmentBundle={segmentBundle}
							currentHandle={currentHandle}
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
	return parse(sanitizedContent, options);
}
