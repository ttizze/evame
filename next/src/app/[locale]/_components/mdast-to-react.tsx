import { SegmentWrapper } from "@/app/[locale]/_components/SegmentWrapper";
import type { SegmentBundle } from "@/app/[locale]/types";
import type { Prisma } from "@prisma/client";
import Image from "next/image";
import {
	type ComponentType,
	type JSX,
	type ReactElement,
	createElement,
} from "react";
import React from "react";
import { Tweet as XPost } from "react-tweet";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

const TWEET_ID_RE = /status\/(\d+)/;

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

function wrapSegment<Tag extends keyof JSX.IntrinsicElements>(
	Tag: Tag,
	bundles: SegmentBundle[],
	current?: string,
) {
	return (p: JSX.IntrinsicElements[Tag] & { "data-number-id"?: number }) => {
		/* ───────── ここから追加ロジック ───────── */
		// <p> の唯一の子が tweet リンクなら <TweetContainer> で置換
		if (Tag === "p") {
			const kids = React.Children.toArray(p.children);
			if (
				kids.length === 1 &&
				React.isValidElement<{ href?: string }>(kids[0]) &&
				TWEET_ID_RE.test(kids[0].props.href ?? "")
			) {
				const id = TWEET_ID_RE.exec(kids[0].props.href ?? "")?.[1];
				if (id) return <XPost id={id} />;
			}
		}
		const id = p["data-number-id"];
		const bundle =
			id !== undefined
				? bundles.find((b) => b.segment.number === +id)
				: undefined;

		/* ───────── 追加ここまで ───────── */
		/* セグメント対象でなければそのまま DOM 要素を返す */
		if (!bundle) return createElement(Tag, p, p.children);

		/* --- ここで Client Component に “シリアライズ可能な形” で渡す --- */
		const { children, ...rest } = p;
		return (
			<SegmentWrapper
				bundle={bundle}
				tagName={Tag}
				tagProps={rest as JSX.IntrinsicElements[Tag]} // ★そのまま突っ込む
				currentHandle={current}
			>
				{children} {/* ← children は React が面倒見てくれる */}
			</SegmentWrapper>
		);
	};
}

/* -------------------------------------------------------------------------- */
/*                               Main Converter                               */
/* -------------------------------------------------------------------------- */

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
