import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { MarkdownExtension } from "../../../src/app/[locale]/_components/editor/markdown";
import { createProbeEditor } from "./editor.mjs";
import { install } from "./session.mjs";

install(
	createProbeEditor([], [MarkdownExtension]),
	$convertFromMarkdownString,
	$convertToMarkdownString,
);
