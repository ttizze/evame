import { $convertToMarkdownString } from "@lexical/markdown";
import {
	AutoLinkPlugin,
	createLinkMatcherWithRegExp,
} from "@lexical/react/LexicalAutoLinkPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { TabIndentationPlugin } from "@lexical/react/LexicalTabIndentationPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { $getRoot, $getState, $nodesOfType } from "lexical";
import { useRef } from "react";
import { EditorMenu } from "./editor-menu";
import { ImagePlugin } from "./image-plugin";
import { editorNodes, importMarkdown, markdownTransformers } from "./markdown";
import { ImageNode, imageState } from "./media-nodes";

const linkMatchers = [createLinkMatcherWithRegExp(/https?:\/\/[^\s<>]+/)];

/** 記事とコメントで共有するMarkdown入出力のエディタ。本文の変更だけを保存元へ通知する。 */
export function Editor({
	defaultValue,
	name,
	className,
	placeholder,
	showMenus,
	onChange,
}: {
	defaultValue: string;
	name: string;
	className: string;
	placeholder: string;
	showMenus: boolean;
	onChange: ((markdown: string) => void) | null;
}) {
	const input = useRef<HTMLInputElement>(null);
	const currentMarkdown = useRef(defaultValue);
	return (
		<LexicalComposer
			initialConfig={{
				namespace: "evame-editor",
				nodes: editorNodes,
				editorState: () => {
					importMarkdown(currentMarkdown.current, $getRoot());
					currentMarkdown.current =
						$convertToMarkdownString(markdownTransformers);
				},
				onError: (error) => {
					throw error;
				},
				theme: {
					text: {
						bold: "font-bold",
						italic: "italic",
						strikethrough: "line-through",
						code: "bg-gray-200 dark:bg-gray-900 rounded-md p-1 text-sm",
					},
					list: {
						checklist: "list-none",
						listitemChecked: "editor-checklist-checked",
						listitemUnchecked: "editor-checklist-unchecked",
						nested: { listitem: "list-none" },
					},
					table: "border-collapse",
					tableScrollableWrapper: "overflow-x-auto",
					tableCell: "border border-border px-3 py-2",
					tableCellHeader: "font-semibold bg-muted",
				},
			}}
		>
			<div className="relative">
				<RichTextPlugin
					contentEditable={
						<ContentEditable
							aria-label={placeholder}
							aria-placeholder={placeholder}
							className={`${className} min-h-8 focus:outline-hidden`}
							data-testid="lexical-editor"
							placeholder={
								<div className="pointer-events-none absolute top-0 left-0 text-muted-foreground">
									{placeholder}
								</div>
							}
						/>
					}
					ErrorBoundary={LexicalErrorBoundary}
				/>
				<input
					name={name}
					ref={(element) => {
						input.current = element;
						if (element) element.value = currentMarkdown.current;
					}}
					type="hidden"
				/>
				<input name="contentFormat" type="hidden" value="markdown" />
			</div>
			<HistoryPlugin />
			<ListPlugin />
			<CheckListPlugin />
			<LinkPlugin />
			<AutoLinkPlugin matchers={linkMatchers} />
			<TablePlugin
				hasCellBackgroundColor={false}
				hasCellMerge={false}
				hasHorizontalScroll
			/>
			<TabIndentationPlugin />
			<MarkdownShortcutPlugin transformers={markdownTransformers} />
			<ImagePlugin />
			<OnChangePlugin
				ignoreHistoryMergeTagChange={false}
				ignoreSelectionChange
				onChange={(state) => {
					const markdown = state.read(() => {
						if (
							$nodesOfType(ImageNode).some(
								(node) => $getState(node, imageState).src === "/loading.gif",
							)
						)
							return null;
						return $convertToMarkdownString(markdownTransformers);
					});
					if (markdown === null || markdown === currentMarkdown.current) return;
					currentMarkdown.current = markdown;
					if (input.current) input.current.value = markdown;
					onChange?.(markdown);
				}}
			/>
			{showMenus && <EditorMenu />}
		</LexicalComposer>
	);
}
