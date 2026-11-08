import { CodeNode } from "@lexical/code-core";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
	CHECK_LIST,
	TRANSFORMERS,
} from "@lexical/markdown";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { createProbeEditor } from "./editor.mjs";
import { install } from "./session.mjs";

const transformers = [CHECK_LIST, ...TRANSFORMERS];
install(
	createProbeEditor(
		[CodeNode, LinkNode, ListNode, ListItemNode, HeadingNode, QuoteNode],
		[],
	),
	(source) => $convertFromMarkdownString(source, transformers),
	() => $convertToMarkdownString(transformers),
);
