import { $convertToMarkdownString } from "@lexical/markdown";
import { $getRoot } from "lexical";
import {
	editorNodes,
	importMarkdown,
	markdownTransformers,
} from "../../../src/app/[locale]/_components/editor/markdown";
import { createProbeEditor } from "./editor.mjs";
import { install } from "./session.mjs";

install(
	createProbeEditor(editorNodes, []),
	(source) => importMarkdown(source, $getRoot()),
	() => $convertToMarkdownString(markdownTransformers),
);
