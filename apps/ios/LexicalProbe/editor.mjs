import { buildEditorFromExtensions } from "@lexical/extension";
import { HeadlessExtension } from "@lexical/headless";
import { HistoryExtension } from "@lexical/history";
import { LinkExtension } from "@lexical/link";
import { CheckListExtension, ListExtension } from "@lexical/list";
import { RichTextExtension } from "@lexical/rich-text";
import {
	AbortController,
	AbortSignal,
} from "abort-controller/dist/abort-controller.mjs";
import { configExtension, defineExtension } from "lexical";

globalThis.AbortController = AbortController;
globalThis.AbortSignal = AbortSignal;

export function createProbeEditor(nodes, grammar) {
	return buildEditorFromExtensions(
		defineExtension({
			name: "evame-native-probe",
			nodes,
			onError(error) {
				throw error;
			},
			dependencies: [
				HeadlessExtension,
				RichTextExtension,
				configExtension(ListExtension, { shouldPreserveNumbering: true }),
				CheckListExtension,
				LinkExtension,
				configExtension(HistoryExtension, { disabled: false }),
				...grammar,
			],
		}),
	);
}
