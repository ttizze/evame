import { HistoryExtension } from "@lexical/history";
import {
	$convertFromMarkdownString,
	$convertToMarkdownString,
} from "@lexical/mdast";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalExtensionComposer } from "@lexical/react/LexicalExtensionComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { TableExtension } from "@lexical/table";
import { captureException } from "@sentry/react";
import {
	$create,
	$createTextNode,
	$getRoot,
	$onUpdate,
	configExtension,
	defineExtension,
} from "lexical";
import { type CSSProperties, useRef, useState } from "react";
import { ArticleTitleExtension, ArticleTitleNode } from "./article-title";
import { BlockDragMenu } from "./block-drag-menu";
import { TabEditingExtension } from "./block-editing";
import { DocumentExtension } from "./document";
import { EditorMenu } from "./editor-menu";
import { ImagePlugin } from "./image-plugin";

/** 記事とコメントで共有するMarkdown入出力のエディタ。 */
export function Editor({
	articleTitle,
	defaultValue,
	name,
	className,
	placeholder,
	showMenus,
	onChange,
}: {
	articleTitle: { defaultValue: string; placeholder: string } | null;
	defaultValue: string;
	name: string;
	className: string;
	placeholder: string;
	showMenus: boolean;
	onChange: ((markdown: string) => void) | null;
}) {
	const input = useRef<HTMLInputElement>(null);
	const titleInput = useRef<HTMLInputElement>(null);
	const currentTitle = useRef(articleTitle?.defaultValue ?? "");
	const [anchorElement, setAnchorElement] = useState<HTMLDivElement | null>(
		null,
	);
	const currentMarkdown = useRef(defaultValue);
	const loaded = useRef(false);
	// 拡張は編集画面の生成時に一度だけ作り、再描画でエディタを作り直さない。
	const [extension] = useState(() =>
		defineExtension({
			name: "evame-editor",
			namespace: "evame-editor",
			$initialEditorState: () => {
				$convertFromMarkdownString(currentMarkdown.current);
				if (articleTitle) {
					const title = $create(ArticleTitleNode).append(
						$createTextNode(currentTitle.current),
					);
					const first = $getRoot().getFirstChild();
					if (first) first.insertBefore(title);
					else $getRoot().append(title);
				}
				currentMarkdown.current = $convertToMarkdownString();
				// 読み込み後の変換まで終えて確定してから、読み込み済みとする。
				$onUpdate(() => {
					loaded.current = true;
				});
			},
			// 例外を投げ返すと、Lexicalが途中まで変えた状態を確定済みの状態へ戻す後始末が飛ばされる。
			// 編集中の拒否は記録してLexicalに戻させる。初期の本文を読み込めない場合は、
			// 空の編集画面から保存して本文を失わないよう、画面のエラーにする。
			onError: (error) => {
				if (!loaded.current) throw error;
				console.error(error);
				captureException(error);
			},
			theme: {
				text: {
					bold: "font-bold",
					italic: "italic",
					strikethrough: "line-through",
					code: "bg-gray-200 dark:bg-gray-900 rounded-md p-1 text-sm",
				},
				list: {
					ol: "editor-list",
					ul: "editor-list",
					olDepth: [
						"editor-list-decimal",
						"editor-list-upper-alpha",
						"editor-list-lower-alpha",
						"editor-list-upper-roman",
						"editor-list-lower-roman",
					],
					ulDepth: [
						"editor-list-disc",
						"editor-list-circle",
						"editor-list-square",
					],
					listitem: "editor-list-item",
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
			dependencies: [
				HistoryExtension,
				...(articleTitle ? [ArticleTitleExtension] : []),
				...(showMenus ? [TabEditingExtension] : []),
				configExtension(TableExtension, {
					hasHorizontalScroll: true,
				}),
				DocumentExtension,
			],
		}),
	);
	return (
		<LexicalExtensionComposer contentEditable={null} extension={extension}>
			<div
				className={showMenus ? "relative md:-ml-8" : "relative"}
				ref={showMenus ? setAnchorElement : null}
			>
				<ContentEditable
					aria-label={placeholder}
					aria-placeholder={placeholder}
					className={`${className} min-h-8 focus:outline-hidden ${showMenus ? "flow-root md:pl-8" : ""}`}
					data-article-editor={articleTitle ? "true" : undefined}
					data-testid="lexical-editor"
					placeholder={
						articleTitle ? (
							() => null
						) : (
							<p
								className={`pointer-events-none absolute top-0 left-0 text-muted-foreground ${showMenus ? "md:left-8" : "m-0!"}`}
							>
								{placeholder}
							</p>
						)
					}
					style={
						articleTitle
							? ({
									"--title-placeholder": JSON.stringify(
										articleTitle.placeholder,
									),
									"--body-placeholder": JSON.stringify(placeholder),
								} as CSSProperties)
							: undefined
					}
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
				{articleTitle && (
					<input
						name="title"
						ref={(element) => {
							titleInput.current = element;
							if (element) element.value = currentTitle.current;
						}}
						type="hidden"
					/>
				)}
			</div>
			<ImagePlugin />
			<OnChangePlugin
				ignoreHistoryMergeTagChange={false}
				ignoreSelectionChange
				onChange={(state, editor) => {
					const { markdown, title } = state.read(
						() => ({
							markdown: $convertToMarkdownString(),
							title: articleTitle
								? ($getRoot().getFirstChild()?.getTextContent() ?? "")
								: "",
						}),
						{
							editor,
						},
					);
					if (
						markdown === currentMarkdown.current &&
						title === currentTitle.current
					)
						return;
					currentMarkdown.current = markdown;
					currentTitle.current = title;
					if (input.current) input.current.value = markdown;
					if (titleInput.current) titleInput.current.value = title;
					onChange?.(markdown);
				}}
			/>
			{showMenus && (
				<>
					<EditorMenu pageRoot={anchorElement?.closest("#root") ?? null} />
					{anchorElement && <BlockDragMenu anchorElement={anchorElement} />}
				</>
			)}
		</LexicalExtensionComposer>
	);
}
