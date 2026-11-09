import { CodeExtension } from "@lexical/code-core";
import { LinkExtension } from "@lexical/link";
import { CheckListExtension, ListExtension } from "@lexical/list";
import { TableExtension } from "@lexical/table";
import { configExtension, defineExtension } from "lexical";
import { MarkdownExtension } from "./markdown";
import { ShortcutsExtension } from "./shortcuts";

/** PCとiPhoneが使う本文ノード・変換・編集ルール。表示と履歴の環境設定は各ホストが所有する。 */
export const DocumentExtension = defineExtension({
	name: "evame-document",
	dependencies: [
		MarkdownExtension,
		ShortcutsExtension,
		CodeExtension,
		configExtension(ListExtension, { shouldPreserveNumbering: true }),
		CheckListExtension,
		LinkExtension,
		configExtension(TableExtension, {
			hasCellBackgroundColor: false,
			hasCellMerge: false,
		}),
	],
});
