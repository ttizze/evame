import type { ReactElement } from "react";
import { type ComponentType, createElement, type JSX } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Segment } from "@/app/[locale]/types";
import type { JsonValue } from "@/db/types";
import { remarkTweet } from "./remark-tweet";
import { WrapSegment } from "./wrap-segments";

// --------------
const SEGMENTABLE = [
	"p",
	"h1",
	"h2",
	"h3",
	"h4",
	"h5",
	"h6",
	"li",
	"td",
	"th",
	"blockquote",
] as const satisfies readonly (keyof JSX.IntrinsicElements)[];

type ImgProps = Omit<JSX.IntrinsicElements["img"], "src"> & {
	src?: string;
};

const ImgComponent: ComponentType<ImgProps> = ({ src = "", ...props }) => (
	<img
		{...props}
		alt={props.alt ?? ""}
		className={`h-auto w-auto max-w-full ${props.className ?? ""}`.trim()}
		height={props.height ?? 300}
		src={src}
		width={props.width ?? 300}
	/>
);

interface Params<T extends Segment = Segment> {
	mdast: JsonValue;
	segments: T[];
	Tweet: ComponentType<{ id: string }>;
	/**
	 * If true, render translations as clickable buttons (`data-segment-id`) so
	 * `TranslationFormOnClick` can open the vote/add UI.
	 * If false, render translation text without a button (no click behavior).
	 */
	interactive?: boolean;
}

/** 本文のHTMLをサニタイズして描画する。装飾は既知のクラス、iframeは既知の埋め込み先に限定する。 */
export function mdastToReact<T extends Segment = Segment>({
	mdast,
	segments,
	Tweet,
	interactive = true,
}: Params<T>): ReactElement | null {
	if (!mdast || Object.keys(mdast).length === 0) return null;
	const segmentComponents = Object.fromEntries(
		SEGMENTABLE.map((tag) => [tag, WrapSegment(tag, segments, interactive)]),
	);

	const processor = unified()
		.use(remarkTweet)
		.use(remarkRehype, { allowDangerousHtml: true }) // mdast → hast
		.use(rehypeRaw) // parse raw HTML
		.use(rehypeSanitize, {
			...defaultSchema,
			tagNames: [...(defaultSchema.tagNames ?? []), "tweet", "iframe"],
			attributes: {
				...defaultSchema.attributes,
				"*": [...(defaultSchema.attributes?.["*"] ?? []), "dataNumberId"],
				a: [
					...(defaultSchema.attributes?.a ?? []).filter(
						(attribute) =>
							!Array.isArray(attribute) || attribute[0] !== "className",
					),
					["className", "data-footnote-backref", "remark-link-card-plus__card"],
					["target", "_blank"],
					["rel", "noreferrer", "noopener"],
				],
				div: [
					...(defaultSchema.attributes?.div ?? []),
					[
						"className",
						"remark-link-card-plus__container",
						"remark-link-card-plus__thumbnail",
						"remark-link-card-plus__main",
						"remark-link-card-plus__content",
						"remark-link-card-plus__title",
						"remark-link-card-plus__description",
						"remark-link-card-plus__meta",
					],
				],
				img: [
					...(defaultSchema.attributes?.img ?? []),
					[
						"className",
						"remark-link-card-plus__image",
						"remark-link-card-plus__favicon",
					],
				],
				span: [["className", "remark-link-card-plus__url"]],
				tweet: ["dataTweetId"],
				iframe: [
					[
						"src",
						/^https:\/\/(?:www\.youtube(?:-nocookie)?\.com\/embed\/[\w-]+|player\.vimeo\.com\/video\/\d+|open\.spotify\.com\/embed\/(?:track|album|playlist|artist|episode|show)\/[a-zA-Z\d]+|w\.soundcloud\.com\/player\/|www\.dailymotion\.com\/embed\/video\/[\w-]+)(?:\?[^\s"<>\\]*)?$/,
					],
					"title",
					"width",
					"height",
				],
			},
		})
		.use(rehypeSlug) // add slug ids
		.use(rehypeReact, {
			createElement,
			...jsxRuntime,
			components: {
				// Render markdown images without a framework-specific image loader.
				img: ImgComponent,
				iframe: ({ src, ...props }: JSX.IntrinsicElements["iframe"]) =>
					src ? (
						<iframe
							{...props}
							allow="encrypted-media; fullscreen; picture-in-picture"
							allowFullScreen
							className="max-w-full"
							loading="lazy"
							referrerPolicy="no-referrer"
							src={src}
							title={props.title ?? src}
						/>
					) : null,
				tweet: (props: { "data-tweet-id": string }) => (
					<span className="not-prose">
						<Tweet id={props["data-tweet-id"]} />
					</span>
				),
				...segmentComponents,
			},
		});

	// Run plugins & stringify to React elements
	const hast = processor.runSync(structuredClone(mdast));
	return processor.stringify(hast) as ReactElement;
}
