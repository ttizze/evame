import {
	$createHorizontalRuleNode,
	HorizontalRuleNode,
} from "@lexical/extension";
import { AutoLinkExtension, createLinkMatcherWithRegExp } from "@lexical/link";
import { registerMarkdownShortcuts } from "@lexical/markdown";
import { MdastShortcutsExtension } from "@lexical/mdast";
import { $isParagraphNode, configExtension, defineExtension } from "lexical";

/**
 * 入力中にMarkdown記法とURLを書式へ変える。PCとiPhoneの編集で同じ変換にする。
 * 公式のMarkdownショートカットにない区切り線は、行頭の`---`・`***`・`___`と空白で入れる。
 */
export const ShortcutsExtension = defineExtension({
	name: "evame-shortcuts",
	dependencies: [
		MdastShortcutsExtension,
		configExtension(AutoLinkExtension, {
			matchers: [createLinkMatcherWithRegExp(/https?:\/\/[^\s<>]+/)],
		}),
	],
	register: (editor) =>
		registerMarkdownShortcuts(editor, [
			{
				type: "element",
				dependencies: [HorizontalRuleNode],
				regExp: /^(?:---|\*\*\*|___)\s$/,
				// Lexical公式の例と同じく、記号だけの段落の前へ区切り線を入れて続きを入力できるようにする。
				replace: (parent) => {
					if (!$isParagraphNode(parent)) return false;
					const line = $createHorizontalRuleNode();
					if (parent.getNextSibling()) parent.replace(line);
					else parent.insertBefore(line);
					line.selectNext();
				},
				export: () => null,
			},
		]),
});
