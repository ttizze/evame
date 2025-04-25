import type { SegmentBundle } from "@/app/[locale]/types";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import type { ReactElement } from "react";
import { type ComponentType, type JSX, createElement } from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { wrapSegment } from "./wrap-segments.server";

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

/** Normal link renderer */
const Link: ComponentType<JSX.IntrinsicElements["a"]> = ({
	href = "",
	children,
	...rest
}) => (
	<a href={href} {...rest}>
		{children}
	</a>
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
}: Params): Promise<ReactElement> {
	const segmentComponents = Object.fromEntries(
		SEGMENTABLE.map((tag) => [tag, wrapSegment(tag, bundles, currentHandle)]),
	);

	const processor = unified()
		.use(remarkRehype, { allowDangerousHtml: true }) // mdast → hast
		.use(rehypeRaw) // parse raw HTML
		.use(rehypeSlug) // add slug ids
		.use(rehypeReact, {
			createElement,
			...jsxRuntime,
			components: {
				// image hydration → next/image
				img: ImgComponent,
				a: Link,
				...segmentComponents,
			},
		});

	// Run plugins & stringify to React elements
	const hast = processor.runSync(mdast);
	return processor.stringify(hast) as ReactElement;
}
