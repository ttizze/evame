import { $getState, createState, DecoratorNode, ElementNode } from "lexical";
import type { ReactNode } from "react";

export const htmlState = createState("html", {
	parse: (value) => (typeof value === "string" ? value : ""),
});

/** 本文に書かれたHTML。値をそのまま保持して保存時に同じHTMLを書き出す。 */
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
