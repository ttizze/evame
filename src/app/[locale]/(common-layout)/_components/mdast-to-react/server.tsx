import remarkEmbedder from "@remark-embedder/core";
import oembedTransformer from "@remark-embedder/transformer-oembed";
import type { StaticImport } from "next/dist/shared/lib/get-img-props";
import Image from "next/image";
import type { ComponentType, JSX, ReactElement } from "react";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import remarkLinkCard from "remark-link-card-plus";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { Segment } from "@/app/[locale]/types";
import type { JsonValue } from "@/db/types";
import { WrapSegment } from "../wrap-segments/server";
import { remarkTweet } from "./remark-tweet";
import { SEGMENTABLE, TweetEmbed } from "./shared";

// Note: server variant keeps rich plugins (link card / pretty code / next/image).

interface ImgProps extends Omit<JSX.IntrinsicElements["img"], "src"> {
	src?: string | StaticImport;
}

const ImgComponent: ComponentType<ImgProps> = ({ src = "", ...props }) => (
	<Image
		{...props}
		alt={props.alt ?? ""}
		className="h-auto w-auto max-w-full"
		height={props.height ? Number(props.height) : 300}
		priority={false}
		src={src}
		width={props.width ? Number(props.width) : 300}
	/>
);

interface Params<T extends Segment = Segment> {
	mdast: JsonValue;
	segments: T[];
	/**
	 * If true, render translations as clickable buttons (`data-segment-id`) so
	 * `TranslationFormOnClick` can open the vote/add UI.
	 * If false, render translation text without a button (no click behavior).
	 */
	interactive?: boolean;
}

/** mdast(JSON) → React 要素 */
export async function mdastToReact<T extends Segment = Segment>({
	mdast,
	segments,
	interactive = true,
}: Params<T>): Promise<ReactElement | null> {
	if (!mdast || Object.keys(mdast).length === 0) return null;
	const segmentComponents = Object.fromEntries(
		SEGMENTABLE.map((tag) => [tag, WrapSegment(tag, segments, interactive)]),
	);

	const processor = unified()
		.use(remarkTweet)
		.use(remarkEmbedder, { transformers: [oembedTransformer] })
		.use(remarkLinkCard, {
			cache: false,
			shortenUrl: true,
			noFavicon: true,
		})
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
				img: ImgComponent,
				tweet: TweetEmbed,
				...segmentComponents,
			},
		});

	// Run plugins & stringify to React elements
	const hast = await processor.run(mdast);
	return processor.stringify(hast) as unknown as ReactElement;
}
