import { ListNode } from "@lexical/list";
import { listMarkerState, orderedMarkerState } from "@lexical/mdast";
import {
	$createParagraphNode,
	$getState,
	createState,
	DecoratorNode,
	ElementNode,
} from "lexical";
import type { ReactNode } from "react";

/** Markdownでは異なる記号の隣接リストは別のグループなので、自動結合で区切りを失わない。 */
export class MarkdownListNode extends ListNode {
	$config() {
		return this.config("markdown-list", { extends: ListNode });
	}
	canMergeAdjacentList(next: ListNode) {
		return (
			super.canMergeAdjacentList(next) &&
			($getState(this, listMarkerState) || "-") ===
				($getState(next, listMarkerState) || "-") &&
			($getState(this, orderedMarkerState) || ".") ===
				($getState(next, orderedMarkerState) || ".")
		);
	}
}

export const htmlState = createState("html", {
	parse: (value) => (typeof value === "string" ? value : ""),
});

/** 文中に書かれたHTML。値をそのまま保持して保存時に同じHTMLを書き出す。 */
export class HtmlNode extends DecoratorNode<ReactNode> {
	$config() {
		return this.config("html", {
			extends: DecoratorNode,
			stateConfigs: [{ flat: true, stateConfig: htmlState }],
		});
	}
	isInline() {
		return true;
	}
	createDOM() {
		return document.createElement("span");
	}
	updateDOM() {
		return false;
	}
	decorate() {
		return (
			<code className="rounded-md bg-muted px-1 text-sm">
				{$getState(this, htmlState)}
			</code>
		);
	}
}

/** 段落の外に書かれたHTML。前後のHTMLと1つの段落にまとめず、ブロックとして保つ。 */
export class HtmlBlockNode extends HtmlNode {
	$config() {
		return this.config("html-block", { extends: HtmlNode });
	}
	isInline() {
		return false;
	}
	createDOM() {
		return document.createElement("div");
	}
}

export const definitionState = createState("definition", {
	parse: (value) => {
		const definition = value as Record<string, unknown> | null;
		return {
			identifier:
				typeof definition?.identifier === "string" ? definition.identifier : "",
			label: typeof definition?.label === "string" ? definition.label : null,
			url: typeof definition?.url === "string" ? definition.url : "",
			title: typeof definition?.title === "string" ? definition.title : null,
		};
	},
});

/** 参照形式のリンク・画像の定義。表示には現れないが、後から書く参照のために保持する。 */
export class DefinitionNode extends DecoratorNode<ReactNode> {
	$config() {
		return this.config("definition", {
			extends: DecoratorNode,
			stateConfigs: [{ flat: true, stateConfig: definitionState }],
		});
	}
	isInline() {
		return false;
	}
	createDOM() {
		return document.createElement("div");
	}
	updateDOM() {
		return false;
	}
	decorate() {
		const { identifier, label, url } = $getState(this, definitionState);
		return (
			<p className="text-muted-foreground text-sm">
				[{label ?? identifier}]: {url}
			</p>
		);
	}
}

export const footnoteState = createState("footnote", {
	parse: (value) => {
		const footnote = value as Record<string, unknown> | null;
		return {
			identifier:
				typeof footnote?.identifier === "string" ? footnote.identifier : "",
			label: typeof footnote?.label === "string" ? footnote.label : null,
		};
	},
});

/** 脚注への参照。番号は表示側が採番するため、識別子だけを持つ。 */
export class FootnoteReferenceNode extends DecoratorNode<ReactNode> {
	$config() {
		return this.config("footnote-reference", {
			extends: DecoratorNode,
			stateConfigs: [{ flat: true, stateConfig: footnoteState }],
		});
	}
	isInline() {
		return true;
	}
	createDOM() {
		return document.createElement("sup");
	}
	updateDOM() {
		return false;
	}
	decorate() {
		const { identifier, label } = $getState(this, footnoteState);
		return `[${label ?? identifier}]`;
	}
}

/** 脚注の本文。段落などのブロックを子に持ち、通常の本文と同じように編集する。 */
export class FootnoteDefinitionNode extends ElementNode {
	$config() {
		return this.config("footnote-definition", {
			extends: ElementNode,
			$transform: (node: FootnoteDefinitionNode) => {
				if (node.isEmpty()) node.append($createParagraphNode());
			},
			stateConfigs: [{ flat: true, stateConfig: footnoteState }],
		});
	}
	createDOM() {
		const element = document.createElement("div");
		const { identifier, label } = $getState(this, footnoteState);
		element.dataset.footnote = label ?? identifier;
		element.className =
			"border-l-2 border-border pl-3 text-sm before:content-[attr(data-footnote)] before:text-muted-foreground";
		return element;
	}
	updateDOM() {
		return false;
	}
	isShadowRoot() {
		return true;
	}
}
