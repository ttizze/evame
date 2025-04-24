import rehypeRaw from "rehype-raw";
import rehypeReact from "rehype-react";
import rehypeSlug from "rehype-slug";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

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
import { Tweet as XPost } from "react-tweet";
import * as jsxRuntime from "react/jsx-runtime";
function wrapSegment<Tag extends keyof JSX.IntrinsicElements>(
	Tag: Tag,
	bundles: SegmentBundle[],
	current?: string,
) {
	return (p: JSX.IntrinsicElements[Tag] & { "data-number-id"?: number }) => {
		const id = p["data-number-id"];
		const bundle =
			id !== undefined
				? bundles.find((b) => b.segment.number === +id)
				: undefined;

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
/*                               Helper Factory                               */
/* -------------------------------------------------------------------------- */

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
] as const;

/* -------------------------------------------------------------------------- */
/*                               X (Post) Resolver                            */
/* -------------------------------------------------------------------------- */

// ツイートを処理するための特別なコンポーネント
export const TweetContainer: ComponentType<{ id: string }> = ({ id }) => {
	return (
		<div className="my-4">
			<XPost id={id} />
		</div>
	);
};

export const LinkOrTweet: ComponentType<JSX.IntrinsicElements["a"]> = ({
	href = "",
	children,
	...rest
}) => {
	// ── ① status の後ろに続く数字だけ取る ──
	const tweetId = href.match(/status\/(\d+)/)?.[1];

	if (tweetId) {
		// ツイートの場合は特別なコンポーネントを返す
		// この時点では何も返さない（後で処理する）
		return <TweetContainer id={tweetId} />;
	}

	// 通常のリンクの場合
	return (
		<a href={href} {...rest}>
			{children}
		</a>
	);
};
/* -------------------------------------------------------------------------- */
/*                               Main Converter                               */
/* -------------------------------------------------------------------------- */

interface Params {
	mdast: Prisma.JsonValue;
	bundles: SegmentBundle[];
	currentHandle?: string;
}

/** mdast(JSON) → React 要素 */
export function mdastToReact({
	mdast,
	bundles,
	currentHandle,
}: Params): ReactElement {
	const components = Object.fromEntries(
		SEGMENTABLE.map((t) => [t, wrapSegment(t, bundles, currentHandle)]),
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
				img: ((p: JSX.IntrinsicElements["img"]) => (
					<Image
						{...p}
						src={p.src ?? ""}
						alt={p.alt ?? ""}
						width={p.width ? Number(p.width) : 300}
						height={p.height ? Number(p.height) : 300}
						className="h-auto w-auto max-w-full"
						priority={false}
					/>
				)) as ComponentType<JSX.IntrinsicElements["img"]>,
				a: LinkOrTweet,
				...components,
			},
		});

	// Run plugins & stringify to React elements
	const hast = processor.runSync(mdast);
	return processor.stringify(hast) as ReactElement;
}
