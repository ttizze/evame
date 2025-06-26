import type { Prisma } from "@prisma/client";
import remarkEmbedder from "@remark-embedder/core";
import oembedTransformer from "@remark-embedder/transformer-oembed";
import Image from "next/image";
import type { ReactElement } from "react";
import { type ComponentType, createElement, type JSX } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import remarkLinkCard from "remark-link-card-plus";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { SegmentBundle } from "@/app/[locale]/types";
import { wrapSegment } from "./wrap-segments/server";

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

const ImgComponent: ComponentType<JSX.IntrinsicElements["img"]> = (props) => (
	<Image
		{...props}
		src={props.src ?? ""}
		alt={props.alt ?? ""}
		width={props.width ? Number(props.width) : 300}
		height={props.height ? Number(props.height) : 300}
		className="h-auto w-auto max-w-full"
		priority={false}
	/>
);

interface Params {
	mdast: Prisma.JsonValue;
	bundles: SegmentBundle[];
	currentHandle?: string;
}

/** mdast(JSON) → React 要素 */
export async function mdastToReact({
	mdast,
	bundles,
	currentHandle,
}: Params): Promise<ReactElement | null> {
	if (!mdast || Object.keys(mdast).length === 0) return null;
	const segmentComponents = Object.fromEntries(
		SEGMENTABLE.map((tag) => [tag, wrapSegment(tag, bundles, currentHandle)]),
	);

	const processor = unified()
		.use(remarkEmbedder, { transformers: [oembedTransformer] })
		.use(remarkLinkCard, { cache: true, shortenUrl: true, noFavicon: true })
		.use(remarkRehype, { allowDangerousHtml: true }) // mdast → hast
		.use(rehypeRaw) // parse raw HTML
		.use(rehypeSlug) // add slug ids
		.use(rehypePrettyCode, {
			themes: {
				// 2 つ書くと自動でダーク／ライト切替
				light: "github-light",
				dark: "github-dark",
			},
			keepBackground: true,
			defaultLang: "typescript",
			aliases: {
				typescriptreact: "tsx",
			},
		})
		.use(rehypeReact, {
			createElement,
			...jsxRuntime,
			components: {
				// image hydration → next/image
				img: ImgComponent,
				...segmentComponents,
			},
		});

	// Run plugins & stringify to React elements
	const hast = await processor.run(mdast);
	return processor.stringify(hast) as ReactElement;
}
