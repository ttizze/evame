"use client";

import type { ComponentType, JSX, ReactElement } from "react";
import { createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import type { JsonValue } from "@/db/types";
import { WrapSegmentClient } from "../wrap-segments/client";
import type { SegmentForRender } from "../wrap-segments/segment-for-render";
import { remarkTweet } from "./remark-tweet";
import { SEGMENTABLE, TweetEmbed } from "./shared";

interface ImgProps extends Omit<JSX.IntrinsicElements["img"], "src"> {
	src?: string;
}

const ImgComponent: ComponentType<ImgProps> = ({ src = "", ...props }) => (
	// biome-ignore lint/performance/noImgElement: client-side rendering for appended sections
	<img
		{...props}
		alt={props.alt ?? ""}
		className="h-auto max-w-full"
		src={src}
	/>
);

interface Params {
	mdast: JsonValue;
	segments: SegmentForRender[];
	interactive?: boolean;
}

export async function mdastToReactClient({
	mdast,
	segments,
	interactive = true,
}: Params): Promise<ReactElement | null> {
	if (!mdast || typeof mdast !== "object") return null;
	if (Array.isArray(mdast)) return null;
	if (Object.keys(mdast).length === 0) return null;

	const segmentComponents = Object.fromEntries(
		SEGMENTABLE.map((tag) => [
			tag,
			WrapSegmentClient(tag, segments, interactive),
		]),
	);

	const processor = unified()
		.use(remarkTweet)
		.use(remarkRehype, { allowDangerousHtml: true })
		.use(rehypeRaw)
		.use(rehypeSlug)
		.use(rehypeReact, {
			createElement,
			...jsxRuntime,
			components: {
				img: ImgComponent,
				tweet: TweetEmbed,
				...segmentComponents,
			},
		});

	const hast = await processor.run(mdast);
	return processor.stringify(hast) as unknown as ReactElement;
}
