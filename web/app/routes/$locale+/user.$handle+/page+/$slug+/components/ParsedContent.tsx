import DOMPurify from "dompurify";
import parse, {
	type HTMLReactParserOptions,
	domToReact,
	type DOMNode,
} from "html-react-parser";
import { memo } from "react";
import type { PageWithTranslations } from "../types";
import { SourceTextAndTranslationSection } from "./sourceTextAndTranslationSection/SourceTextAndTranslationSection";

interface ParsedContentProps {
	pageWithTranslations: PageWithTranslations;
	currentHandle: string | undefined;
	showOriginal: boolean;
	showTranslation: boolean;
	locale: string;
}

export const MemoizedParsedContent = memo(ParsedContent);

export function ParsedContent({
	pageWithTranslations,
	showOriginal = true,
	showTranslation = true,
	currentHandle,
	locale,
}: ParsedContentProps) {
	const sanitizedContent = DOMPurify.sanitize(
		pageWithTranslations.page.content,
	);
	const doc = new DOMParser().parseFromString(sanitizedContent, "text/html");

	const options: HTMLReactParserOptions = {
		replace: (domNode) => {
			if (domNode.type === "tag" && domNode.attribs["data-segment-id"]) {
				const sourceTextId = Number(domNode.attribs["data-segment-id"]);
				const sourceTextWithTranslation =
					pageWithTranslations.sourceTextWithTranslations.find(
						(info) => info.sourceText.id === sourceTextId,
					);
				if (!sourceTextWithTranslation) {
					return null;
				}
				const DynamicTag = domNode.name as keyof JSX.IntrinsicElements;
				const { class: className, ...otherAttribs } = domNode.attribs;
				return (
					<DynamicTag {...otherAttribs} className={className}>
						<SourceTextAndTranslationSection
							key={`translation-${sourceTextId}`}
							sourceTextWithTranslations={sourceTextWithTranslation}
							elements={domToReact(domNode.children as DOMNode[], options)}
							showOriginal={showOriginal}
							showTranslation={showTranslation}
							currentHandle={currentHandle}
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

	return parse(doc.body.innerHTML, options);
}
