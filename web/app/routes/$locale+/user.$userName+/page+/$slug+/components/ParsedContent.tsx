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
	currentUserName: string | undefined;
	showOriginal: boolean;
	showTranslation: boolean;
}

export const MemoizedParsedContent = memo(ParsedContent);

export function ParsedContent({
	pageWithTranslations,
	showOriginal = true,
	showTranslation = true,
	currentUserName,
}: ParsedContentProps) {
	const sanitizedContent = DOMPurify.sanitize(
		pageWithTranslations.page.content,
	);
	const doc = new DOMParser().parseFromString(sanitizedContent, "text/html");

	const options: HTMLReactParserOptions = {
		replace: (domNode) => {
			if (domNode.type === "tag" && domNode.attribs["data-source-text-id"]) {
				const sourceTextId = Number(domNode.attribs["data-source-text-id"]);
				const sourceTextWithTranslation =
					pageWithTranslations.sourceTextWithTranslations.find(
						(info) => info.sourceText.id === sourceTextId,
					);
				if (!sourceTextWithTranslation) {
					return null;
				}
				if (domNode.name === "a") {
					return (
						<a
							href={domNode.attribs.href}
							className="underline underline-offset-4 decoration-blue-500"
						>
							{domToReact(domNode.children as DOMNode[], options)}
						</a>
					);
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
							currentUserName={currentUserName}
						/>
					</DynamicTag>
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
