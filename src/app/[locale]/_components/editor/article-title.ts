import {
	$getClipboardDataFromSelection,
	$insertDataTransferForRichText,
	$insertGeneratedNodes,
	setLexicalClipboardDataTransfer,
} from "@lexical/clipboard";
import { AutoLinkExtension, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
	$generateNodesFromMarkdownString,
	MdastExtension,
	MdastShortcutsExtension,
} from "@lexical/mdast";
import { $isHeadingNode } from "@lexical/rich-text";
import { $isAtEdgeOfElement } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import {
	$addUpdateTag,
	$create,
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isElementNode,
	$isLineBreakNode,
	$isParagraphNode,
	$isRangeSelection,
	$isTextNode,
	$setSelection,
	COMMAND_PRIORITY_CRITICAL,
	CONTROLLED_TEXT_INSERTION_COMMAND,
	CUT_COMMAND,
	CUT_TAG,
	configExtension,
	DELETE_CHARACTER_COMMAND,
	DELETE_LINE_COMMAND,
	DELETE_WORD_COMMAND,
	DRAGSTART_COMMAND,
	DROP_COMMAND,
	defineExtension,
	ElementNode,
	FORMAT_ELEMENT_COMMAND,
	FORMAT_TEXT_COMMAND,
	INDENT_CONTENT_COMMAND,
	INSERT_LINE_BREAK_COMMAND,
	INSERT_PARAGRAPH_COMMAND,
	KEY_ENTER_COMMAND,
	type LexicalNode,
	mergeRegister,
	OUTDENT_CONTENT_COMMAND,
	PASTE_COMMAND,
	REMOVE_TEXT_COMMAND,
	RootNode,
	SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
} from "lexical";
import {
	$isEntireDocumentSelection,
	listCommands,
	SET_TEXT_BLOCK_COMMAND,
} from "./block-editing";

export class ArticleTitleNode extends ElementNode {
	$config() {
		return this.config("article-title", {
			extends: ElementNode,
			children: "inline",
		});
	}
	createDOM() {
		const element = document.createElement("h1");
		element.dataset.testid = "title-input";
		element.className = "article-title";
		return element;
	}
	updateDOM() {
		return false;
	}
	collapseAtStart() {
		return true;
	}
	canIndent() {
		return false;
	}
	insertNewAfter() {
		const paragraph = $createParagraphNode();
		this.insertAfter(paragraph);
		return paragraph;
	}
}

export function $isArticleTitleSelection() {
	const selection = $getSelection();
	return (
		$isRangeSelection(selection) &&
		selection
			.getNodes()
			.some(
				(node) =>
					node instanceof ArticleTitleNode ||
					node.getTopLevelElement() instanceof ArticleTitleNode,
			)
	);
}

export function $isEntireArticleBodySelection() {
	const selection = $getSelection();
	const title = $getRoot().getFirstChild();
	if (
		!$isRangeSelection(selection) ||
		selection.isCollapsed() ||
		!(title instanceof ArticleTitleNode)
	)
		return false;
	const [start, end] = selection.isBackward()
		? [selection.focus, selection.anchor]
		: [selection.anchor, selection.focus];
	const firstBody = title.getNextSibling();
	const lastBody = $getRoot().getLastChild();
	return (
		$isElementNode(firstBody) &&
		$isElementNode(lastBody) &&
		$isAtEdgeOfElement(start, firstBody, "previous") &&
		$isAtEdgeOfElement(end, lastBody, "next")
	);
}

function $removeAcrossTitle() {
	const selection = $getSelection();
	if (
		!$isRangeSelection(selection) ||
		selection.isCollapsed() ||
		!$isArticleTitleSelection()
	)
		return false;
	const [start, end] = selection.isBackward()
		? [selection.focus, selection.anchor]
		: [selection.anchor, selection.focus];
	if (end.getNode().getTopLevelElement() instanceof ArticleTitleNode)
		return false;
	const startPoint = { key: start.key, offset: start.offset, type: start.type };
	const endPoint = { key: end.key, offset: end.offset, type: end.type };
	const title = $getRoot().getFirstChildOrThrow();
	if (!(title instanceof ArticleTitleNode)) return false;
	const root = $getRoot();
	const lastBody = root.getLastChild();
	if (
		(endPoint.key === root.getKey() &&
			endPoint.offset === root.getChildrenSize()) ||
		($isElementNode(lastBody) && $isAtEdgeOfElement(end, lastBody, "next"))
	) {
		for (const node of title.getNextSiblings()) node.remove();
		root.append($createParagraphNode());
	} else {
		const bodySelection = title.getNextSibling()?.selectStart();
		if (bodySelection) {
			bodySelection.focus.set(endPoint.key, endPoint.offset, endPoint.type);
			bodySelection.removeText();
		}
	}
	const titleSelection = title.selectEnd();
	if (startPoint.key === "root") title.select(0, title.getChildrenSize());
	else
		titleSelection.anchor.set(
			startPoint.key,
			startPoint.offset,
			startPoint.type,
		);
	const current = $getSelection();
	if ($isRangeSelection(current)) current.removeText();
	return true;
}

export const ArticleTitleExtension = defineExtension({
	name: "evame-article-title",
	nodes: [ArticleTitleNode],
	dependencies: [
		MdastShortcutsExtension,
		configExtension(AutoLinkExtension, {
			excludeParents: [(parent) => parent instanceof ArticleTitleNode],
		}),
		configExtension(MdastExtension, {
			exportRules: [{ type: ArticleTitleNode, $export: () => [] }],
		}),
	],
	register: (editor, _config, state) => {
		const shortcuts = state.getDependency(MdastShortcutsExtension).output;
		const insertTitleClipboard = (clipboard: DataTransfer) => {
			const selection = $getSelection();
			if (!$isRangeSelection(selection) || !$isArticleTitleSelection())
				return false;
			if (
				!(
					selection.anchor.getNode().getTopLevelElement() instanceof
					ArticleTitleNode
				) ||
				!(
					selection.focus.getNode().getTopLevelElement() instanceof
					ArticleTitleNode
				)
			) {
				if (
					clipboard.getData("text/html") ||
					clipboard.getData("application/x-lexical-editor")
				)
					$insertDataTransferForRichText(clipboard, selection);
				else {
					const text =
						clipboard.getData("text/plain") ||
						clipboard.getData("text/uri-list");
					if (!text) return false;
					$insertGeneratedNodes(
						editor,
						$generateNodesFromMarkdownString(text),
						selection,
					);
				}
				return true;
			}
			const text =
				clipboard.getData("text/plain") ||
				new DOMParser().parseFromString(
					clipboard.getData("text/html"),
					"text/html",
				).body.textContent ||
				"";
			if (text) selection.insertRawText(text.replace(/\r\n|\r|\n/g, " "));
			return true;
		};
		const enterBody = () => {
			if (!$isArticleTitleSelection()) return false;
			if (editor.isComposing()) return true;
			$removeAcrossTitle();
			$getRoot().getChildren()[1]?.selectStart();
			return true;
		};
		return mergeRegister(
			editor.registerUpdateListener(({ editorState }) => {
				shortcuts.disabled.value = editorState.read($isArticleTitleSelection);
			}),
			editor.registerNodeTransform(RootNode, (root) => {
				shortcuts.disabled.value = $isArticleTitleSelection();
				let title = root
					.getChildren()
					.find((node) => node instanceof ArticleTitleNode);
				if (!title) title = $create(ArticleTitleNode);
				const first = root.getFirstChild();
				if (!first) root.append(title);
				else if (!first.is(title)) first.insertBefore(title);
				if (!title.getNextSibling()) root.append($createParagraphNode());
				for (const node of root.getChildren().slice(1)) {
					if (node instanceof ArticleTitleNode)
						node.replace($createParagraphNode().append(...node.getChildren()));
				}
			}),
			editor.registerNodeTransform(ArticleTitleNode, (title) => {
				let bodyAnchor: LexicalNode = title;
				for (const child of title.getChildren()) {
					if ($isTextNode(child)) {
						if (child.getFormat()) child.setFormat(0);
						if (child.getStyle()) child.setStyle("");
						const text = child.getTextContent().replace(/\r\n|\r|\n/g, " ");
						if (text !== child.getTextContent()) child.setTextContent(text);
					} else if ($isLineBreakNode(child))
						child.replace($createTextNode(" "));
					else if ($isElementNode(child) && child.isInline()) {
						for (const descendant of child.getChildren())
							child.insertBefore(descendant);
						child.remove();
					} else {
						const block =
							$isElementNode(child) && !child.isInline()
								? child
								: $createParagraphNode().append(child);
						bodyAnchor.insertAfter(block);
						bodyAnchor = block;
					}
				}
				if (title.getIndent()) title.setIndent(0);
				if (title.getFormat()) title.setFormat("");
			}),
			editor.registerCommand(
				SET_TEXT_BLOCK_COMMAND,
				$isArticleTitleSelection,
				COMMAND_PRIORITY_CRITICAL,
			),
			...listCommands.map(({ command }) =>
				editor.registerCommand(
					command,
					$isArticleTitleSelection,
					COMMAND_PRIORITY_CRITICAL,
				),
			),
			editor.registerCommand(
				FORMAT_TEXT_COMMAND,
				$isArticleTitleSelection,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				FORMAT_ELEMENT_COMMAND,
				$isArticleTitleSelection,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				INDENT_CONTENT_COMMAND,
				$isArticleTitleSelection,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				OUTDENT_CONTENT_COMMAND,
				$isArticleTitleSelection,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				TOGGLE_LINK_COMMAND,
				$isArticleTitleSelection,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				INSERT_TABLE_COMMAND,
				$isArticleTitleSelection,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				KEY_ENTER_COMMAND,
				(event) => {
					if (!$isArticleTitleSelection()) return false;
					if (
						event?.isComposing ||
						event?.keyCode === 229 ||
						editor.isComposing()
					)
						return true;
					event?.preventDefault();
					return enterBody();
				},
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				INSERT_PARAGRAPH_COMMAND,
				enterBody,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				INSERT_LINE_BREAK_COMMAND,
				enterBody,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				DRAGSTART_COMMAND,
				(event) => {
					if (!$isArticleTitleSelection()) return false;
					event.preventDefault();
					return true;
				},
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				DROP_COMMAND,
				(event) => {
					if (
						!(event.target instanceof Element) ||
						!event.target.closest(".article-title")
					)
						return false;
					event.preventDefault();
					return true;
				},
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				CONTROLLED_TEXT_INSERTION_COMMAND,
				(event) => {
					if (typeof event !== "string") {
						if (event.dataTransfer)
							return insertTitleClipboard(event.dataTransfer);
						if (event.data == null) return false;
					}
					if (!$removeAcrossTitle()) return false;
					const selection = $getSelection();
					if ($isRangeSelection(selection))
						selection.insertText(
							(typeof event === "string" ? event : (event.data ?? "")).replace(
								/\r\n|\r|\n/g,
								" ",
							),
						);
					return true;
				},
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				REMOVE_TEXT_COMMAND,
				$removeAcrossTitle,
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				CUT_COMMAND,
				(event) => {
					if (!$isArticleTitleSelection()) return false;
					const selection = $getSelection();
					if (
						!$isRangeSelection(selection) ||
						selection.isCollapsed() ||
						!event ||
						!("clipboardData" in event) ||
						!event.clipboardData
					)
						return false;
					event.preventDefault();
					setLexicalClipboardDataTransfer(
						event.clipboardData,
						$getClipboardDataFromSelection(selection),
					);
					$addUpdateTag(CUT_TAG);
					if (!$removeAcrossTitle()) selection.removeText();
					return true;
				},
				COMMAND_PRIORITY_CRITICAL,
			),
			...[
				DELETE_CHARACTER_COMMAND,
				DELETE_WORD_COMMAND,
				DELETE_LINE_COMMAND,
			].map((command) =>
				editor.registerCommand(
					command,
					(backward) => {
						if ($removeAcrossTitle()) return true;
						const selection = $getSelection();
						if (!$isRangeSelection(selection) || !selection.isCollapsed())
							return false;
						const title = $getRoot().getFirstChildOrThrow();
						if (!(title instanceof ArticleTitleNode)) return false;
						const block = selection.anchor.getNode().getTopLevelElement();
						if (
							block?.is(title) &&
							$isAtEdgeOfElement(
								selection.anchor,
								title,
								backward ? "previous" : "next",
							)
						)
							return true;
						const firstBody = title.getNextSibling();
						if (
							backward &&
							$isElementNode(firstBody) &&
							$isAtEdgeOfElement(selection.anchor, firstBody, "previous")
						) {
							if (command === DELETE_CHARACTER_COMMAND) {
								for (
									let current: LexicalNode | null = selection.anchor.getNode();
									current;
									current = current.getParent()
								) {
									if (
										$isElementNode(current) &&
										!$isParagraphNode(current) &&
										current.collapseAtStart(selection)
									)
										return true;
									if (current.is(firstBody)) break;
								}
							}
							title.selectEnd();
							return true;
						}
						if (
							command === DELETE_WORD_COMMAND &&
							(block?.is(title) ? !backward : backward)
						) {
							const original = selection.clone();
							selection.modify("move", backward, "word");
							const destination = selection.focus
								.getNode()
								.getTopLevelElement();
							if (
								Boolean(block?.is(title)) !== Boolean(destination?.is(title))
							) {
								const boundary = backward
									? title.getNextSibling()?.selectStart().anchor
									: title.selectEnd().anchor;
								if (!boundary) return true;
								original.focus.set(
									boundary.key,
									boundary.offset,
									boundary.type,
								);
								$setSelection(original);
								original.removeText();
								return true;
							}
							$setSelection(original);
						}
						return false;
					},
					COMMAND_PRIORITY_CRITICAL,
				),
			),
			editor.registerCommand(
				PASTE_COMMAND,
				(event) => {
					const clipboard =
						event && "clipboardData" in event
							? event.clipboardData
							: event && "dataTransfer" in event
								? event.dataTransfer
								: null;
					if (!clipboard || !insertTitleClipboard(clipboard)) return false;
					event.preventDefault();
					return true;
				},
				COMMAND_PRIORITY_CRITICAL,
			),
			editor.registerCommand(
				SELECTION_INSERT_CLIPBOARD_NODES_COMMAND,
				({ nodes, selection }) => {
					if (!nodes.length || !$isRangeSelection(selection)) return false;
					$setSelection(selection);
					const root = $getRoot();
					const entire = $isEntireDocumentSelection(
						selection.isCollapsed(),
						selection.anchor,
						selection.focus,
					);
					if (!entire && !$isArticleTitleSelection()) {
						if (!$isEntireArticleBodySelection()) return false;
						const body = root.getChildren().slice(1);
						for (const node of body) node.remove();
						root.append(
							...nodes.map((node) =>
								$isElementNode(node) && !node.isInline()
									? node
									: $createParagraphNode().append(node),
							),
						);
						root.getLastChildOrThrow().selectEnd();
						return true;
					}
					const [first, ...remaining] = nodes;
					const isTitle =
						first instanceof ArticleTitleNode ||
						(($isParagraphNode(first) || $isHeadingNode(first)) &&
							first
								.getChildren()
								.every((node) => $isTextNode(node) || $isLineBreakNode(node)));
					const body = isTitle ? remaining : nodes;
					if (entire) {
						root.clear().append($create(ArticleTitleNode));
						root.getFirstChildOrThrow().selectStart();
					} else $removeAcrossTitle();
					if (isTitle) {
						const current = $getSelection();
						if ($isRangeSelection(current))
							current.insertText(
								first.getTextContent().replace(/\r\n|\r|\n/g, " "),
							);
					}
					let previous = root.getFirstChildOrThrow();
					for (const node of body) {
						const block =
							$isElementNode(node) && !node.isInline()
								? node
								: $createParagraphNode().append(node);
						previous.insertAfter(block);
						previous = block;
					}
					if (
						!previous.getNextSibling() &&
						previous instanceof ArticleTitleNode
					)
						root.append($createParagraphNode());
					if (body.length) previous.selectEnd();
					return true;
				},
				COMMAND_PRIORITY_CRITICAL,
			),
		);
	},
});
