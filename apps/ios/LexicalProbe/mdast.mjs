import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	MdastCommonMarkExtension,
	MdastExtension,
	MdastGfmExtension,
	MdastShadowRootQuoteExtension,
} from "@lexical/mdast";
import { createProbeEditor } from "./editor.mjs";
import { install } from "./session.mjs";

const editor = createProbeEditor(
	[],
	[
		MdastCommonMarkExtension,
		MdastGfmExtension,
		MdastExtension,
		MdastShadowRootQuoteExtension,
	],
);
install(editor, $convertFromMarkdownString, $convertToMarkdownString);
