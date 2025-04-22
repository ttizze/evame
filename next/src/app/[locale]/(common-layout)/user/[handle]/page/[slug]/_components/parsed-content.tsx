import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import { jsonToHtml } from "@/app/[locale]/_lib/json-to-html";
import type { SegmentBundle } from "@/app/[locale]/types";
import type { AstNode } from "@/app/types/ast-node";
import parse, { type HTMLReactParserOptions } from "html-react-parser";
import DOMPurify from "isomorphic-dompurify";
import { customAlphabet } from "nanoid";
import Image from "next/image";
import { memo, useMemo } from "react";
import { Tweet as XPost } from "react-tweet";
interface ParsedContentProps {
	jsonValue: AstNode;
	segmentBundles: SegmentBundle[] | null;
	currentHandle: string | undefined;
}

export const MemoizedParsedContent = memo(ParsedContent);

export function ParsedContent({
	jsonValue,
	segmentBundles,
	currentHandle,
}: ParsedContentProps) {
	const contentHtml = jsonToHtml(jsonValue as AstNode);
	const bundleMap = useMemo(() => {
		if (!segmentBundles) return new Map<string, SegmentBundle>();
		return new Map(
			segmentBundles.map((b) => [b.segment.textAndOccurrenceHash, b]),
		);
	}, [segmentBundles]);

	const sanitizedContent = DOMPurify.sanitize(contentHtml, {
		ADD_ATTR: ["data-hash", "data-type", "xid"],
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
			if (domNode.type === "tag" && domNode.attribs["data-hash"]) {
				const hash = domNode.attribs["data-hash"];
				const segmentBundle = bundleMap.get(hash);
				if (!segmentBundle) {
					return null;
				}
				const DynamicTag = domNode.name as keyof React.JSX.IntrinsicElements;
				const { class: className, ...otherAttribs } = domNode.attribs;
				return (
					<DynamicTag {...otherAttribs} className={className}>
						<SegmentAndTranslationSection
							key={`translation-${hash}`}
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
