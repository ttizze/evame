import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import {
	$create,
	$getState,
	$setState,
	createState,
	DecoratorNode,
} from "lexical";
import type { ReactNode } from "react";
import { Tweet } from "react-tweet";
import { getXPostId } from "@/app/[locale]/_domain/get-x-post-id";

export const imageState = createState("image", {
	/** 外部入力から画像の属性だけを取り出し、欠けた属性を正規化する。 */
	parse: (value) => {
		const image = value as Record<string, unknown> | null;
		return {
			src: typeof image?.src === "string" ? image.src : "",
			alt: typeof image?.alt === "string" ? image.alt : "",
			title: typeof image?.title === "string" ? image.title : null,
		};
	},
});

export class ImageNode extends DecoratorNode<ReactNode> {
	$config() {
		return this.config("image", {
			extends: DecoratorNode,
			stateConfigs: [{ flat: true, stateConfig: imageState }],
		});
	}
	createDOM() {
		return document.createElement("span");
	}
	updateDOM() {
		return false;
	}
	isInline() {
		return true;
	}
	/** コピー時はエディタ内部の状態を通常の画像要素として渡す。 */
	exportDOM() {
		const image = $getState(this, imageState);
		const element = document.createElement("img");
		element.src = image.src;
		element.alt = image.alt;
		if (image.title) element.title = image.title;
		return { element };
	}
	static importDOM() {
		return {
			img: () => ({
				priority: 0 as const,
				conversion: (element: HTMLElement) => ({
					node: $setState($create(ImageNode), imageState, {
						src: element.getAttribute("src") ?? "",
						alt: element.getAttribute("alt") ?? "",
						title: element.getAttribute("title"),
					}),
				}),
			}),
		};
	}
	decorate() {
		return (
			<ImageView nodeKey={this.getKey()} {...$getState(this, imageState)} />
		);
	}
}

/** 画像クリックをノード選択として扱い、削除キーで対象の画像だけを削除できるようにする。 */
function ImageView({
	nodeKey,
	src,
	alt,
	title,
}: {
	nodeKey: string;
	src: string;
	alt: string;
	title: string | null;
}) {
	const [selected, setSelected, clearSelection] =
		useLexicalNodeSelection(nodeKey);
	return (
		<button
			aria-label={alt || src}
			aria-pressed={selected}
			className={`inline-block max-w-full p-0 ${selected ? "outline-2 outline-primary" : ""}`}
			onClick={(event) => {
				event.preventDefault();
				clearSelection();
				setSelected(true);
			}}
			type="button"
		>
			<img
				alt={alt}
				className="max-w-full"
				draggable={false}
				src={src}
				title={title ?? undefined}
			/>
		</button>
	);
}

export const tweetState = createState("url", {
	parse: (value) => (typeof value === "string" ? value : ""),
});

export class TweetNode extends DecoratorNode<ReactNode> {
	isInline() {
		return false;
	}
	$config() {
		return this.config("tweet", {
			extends: DecoratorNode,
			stateConfigs: [{ flat: true, stateConfig: tweetState }],
		});
	}
	createDOM() {
		const element = document.createElement("div");
		element.className = "not-prose";
		return element;
	}
	updateDOM() {
		return false;
	}
	decorate() {
		const url = $getState(this, tweetState);
		return <Tweet id={getXPostId(url) ?? ""} />;
	}
	exportDOM() {
		const element = document.createElement("a");
		element.href = $getState(this, tweetState);
		element.textContent = element.href;
		return { element };
	}
}

export const sourceState = createState("markdown", {
	parse: (value) => (typeof value === "string" ? value : ""),
});

/** Markdownで保持する未対応構文。読み込みだけで元の内容を消さない。 */
export class MarkdownSourceNode extends DecoratorNode<ReactNode> {
	isInline() {
		return false;
	}
	$config() {
		return this.config("markdown-source", {
			extends: DecoratorNode,
			stateConfigs: [{ flat: true, stateConfig: sourceState }],
		});
	}
	createDOM() {
		return document.createElement("div");
	}
	updateDOM() {
		return false;
	}
	decorate() {
		return (
			<pre className="whitespace-pre-wrap">{$getState(this, sourceState)}</pre>
		);
	}
}
