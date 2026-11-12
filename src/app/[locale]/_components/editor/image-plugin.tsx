import { $insertGeneratedNodes } from "@lexical/clipboard";
import { $isCodeNode } from "@lexical/code-core";
import { $generateNodesFromDOM } from "@lexical/html";
import { $generateNodesFromMarkdownString } from "@lexical/mdast";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import {
	$create,
	$createRangeSelection,
	$findMatchingParent,
	$getNodeByKey,
	$getSelection,
	$isNodeSelection,
	$isRangeSelection,
	$setSelection,
	$setState,
	COMMAND_PRIORITY_HIGH,
	createCommand,
	DROP_COMMAND,
	KEY_BACKSPACE_COMMAND,
	KEY_DELETE_COMMAND,
	type LexicalNode,
	PASTE_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { callReaderAction } from "@/app/_service/reader-action";
import { getXPostId } from "@/app/[locale]/_domain/get-x-post-id";
import {
	$isArticleTitleSelection,
	$isEntireArticleBodySelection,
} from "./article-title";
import { $isEntireDocumentSelection } from "./block-editing";
import {
	ImageNode,
	imageState,
	TweetNode,
	tweetState,
	UPLOADING_IMAGE_SRC,
} from "./media-nodes";

export const UPLOAD_IMAGE_COMMAND = createCommand<File>("UPLOAD_IMAGE");

/** 貼り付け・ドロップと画像送信を扱い、コード中の貼り付けは文字列をそのまま挿入する。 */
export function ImagePlugin() {
	const [editor] = useLexicalComposerContext();
	const t = useTranslations("Editor");
	useEffect(() => {
		/** 仮画像のノードを送信結果で更新する。失敗時は仮画像だけを除く。 */
		async function upload(file: File) {
			if (!file.type.startsWith("image/")) return;
			let key = "";
			editor.update(
				() => {
					const image = $setState($create(ImageNode), imageState, {
						src: UPLOADING_IMAGE_SRC,
						alt: file.name,
						title: null,
					});
					key = image.getKey();
					const selection = $getSelection();
					if ($isRangeSelection(selection)) selection.insertNodes([image]);
					else $insertNodeToNearestRoot(image);
				},
				{ discrete: true },
			);
			try {
				const form = new FormData();
				form.set("image", file);
				const result = await callReaderAction("uploadImage", form);
				if (!result.success) throw new Error("Upload failed");
				editor.update(() => {
					const node = $getNodeByKey(key);
					if (node instanceof ImageNode)
						$setState(node, imageState, {
							src: result.data.imageUrl,
							alt: file.name,
							title: null,
						});
				});
			} catch {
				editor.update(() => {
					$getNodeByKey(key)?.remove();
				});
				window.alert(t("imageUploadFailed"));
			}
		}

		/** 選択されたメディアノードの削除を通常の文字削除より先に処理する。 */
		const removeSelected = (event: KeyboardEvent) => {
			const selection = $getSelection();
			if (!$isNodeSelection(selection)) return false;
			event.preventDefault();
			for (const node of selection.getNodes()) node.remove();
			return true;
		};

		return mergeRegister(
			editor.registerCommand(
				UPLOAD_IMAGE_COMMAND,
				(file) => {
					if ($isArticleTitleSelection()) return true;
					void upload(file);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				KEY_BACKSPACE_COMMAND,
				removeSelected,
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				KEY_DELETE_COMMAND,
				removeSelected,
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				DROP_COMMAND,
				(event) => {
					const files = Array.from(event.dataTransfer?.files ?? []).filter(
						(file) => file.type.startsWith("image/"),
					);
					if (!files.length) return false;
					event.preventDefault();
					if (
						document
							.elementFromPoint(event.clientX, event.clientY)
							?.closest(".article-title")
					)
						return true;
					const range = document.caretRangeFromPoint?.(
						event.clientX,
						event.clientY,
					);
					if (
						range &&
						editor.getRootElement()?.contains(range.startContainer)
					) {
						const selection = $createRangeSelection();
						selection.applyDOMRange(range);
						$setSelection(selection);
					}
					if (!$isArticleTitleSelection())
						for (const file of files) void upload(file);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				PASTE_COMMAND,
				(event) => {
					if (!(event instanceof ClipboardEvent)) return false;
					const clipboard = event.clipboardData;
					const text = clipboard?.getData("text/plain") ?? "";
					const selection = $getSelection();
					const replaceDocument =
						$isRangeSelection(selection) &&
						$isEntireDocumentSelection(
							selection.isCollapsed(),
							selection.anchor,
							selection.focus,
						);
					if (
						!replaceDocument &&
						!$isEntireArticleBodySelection() &&
						$isRangeSelection(selection) &&
						text &&
						(selection.hasFormat("code") ||
							$findMatchingParent(selection.anchor.getNode(), $isCodeNode))
					) {
						event.preventDefault();
						selection.insertRawText(text);
						return true;
					}
					const files = Array.from(clipboard?.files ?? []).filter((file) =>
						file.type.startsWith("image/"),
					);
					if (files.length && !clipboard?.getData("text/html")) {
						event.preventDefault();
						for (const file of files) void upload(file);
						return true;
					}
					if (!$isRangeSelection(selection)) return false;
					// エディタ内でのコピーは、HTMLや脚注のノードを失わないLexical標準の貼り付けに任せる。
					if (clipboard?.getData("application/x-lexical-editor")) return false;
					if (getXPostId(text.trim()) !== null) {
						event.preventDefault();
						$insertNodeToNearestRoot(
							$setState($create(TweetNode), tweetState, text.trim()),
						);
						return true;
					}
					const html = clipboard?.getData("text/html");
					let nodes: LexicalNode[];
					if (html) {
						const normalized = html
							.replace(/(<br\b[^>]*>\s*){2,}/gi, "</p><p>")
							.replace(/<p[^>]*>(?:\s|&nbsp;|<br\b[^>]*>)*<\/p>/gi, "");
						const dom = new DOMParser().parseFromString(
							normalized,
							"text/html",
						);
						nodes = $generateNodesFromDOM(editor, dom);
					} else {
						if (!text) return false;
						nodes = $generateNodesFromMarkdownString(text);
					}
					event.preventDefault();
					if (!nodes.length) return true;
					$insertGeneratedNodes(editor, nodes, selection);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		);
	}, [editor, t]);
	return null;
}
