import { $generateNodesFromDOM } from "@lexical/html";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createQuoteNode } from "@lexical/rich-text";
import { $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import {
	$create,
	$createRangeSelection,
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
	PASTE_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { callReaderAction } from "@/app/_service/reader-action";
import { getXPostId } from "@/app/[locale]/_domain/get-x-post-id";
import { importMarkdown } from "./markdown";
import { ImageNode, imageState, TweetNode, tweetState } from "./media-nodes";

export const UPLOAD_IMAGE_COMMAND = createCommand<File>("UPLOAD_IMAGE");

export function ImagePlugin() {
	const [editor] = useLexicalComposerContext();
	const t = useTranslations("Editor");
	useEffect(() => {
		async function upload(file: File) {
			if (!file.type.startsWith("image/")) return;
			let key = "";
			editor.update(
				() => {
					const image = $setState($create(ImageNode), imageState, {
						src: "/loading.gif",
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
					const files = Array.from(clipboard?.files ?? []).filter((file) =>
						file.type.startsWith("image/"),
					);
					if (files.length && !clipboard?.getData("text/html")) {
						event.preventDefault();
						for (const file of files) void upload(file);
						return true;
					}
					const text = clipboard?.getData("text/plain") ?? "";
					const selection = $getSelection();
					if (!$isRangeSelection(selection)) return false;
					if (getXPostId(text.trim()) !== null) {
						event.preventDefault();
						$insertNodeToNearestRoot(
							$setState($create(TweetNode), tweetState, text.trim()),
						);
						return true;
					}
					const html = clipboard?.getData("text/html");
					if (html) {
						event.preventDefault();
						const normalized = html
							.replace(/(<br\b[^>]*>\s*){2,}/gi, "</p><p>")
							.replace(/<p[^>]*>(?:\s|&nbsp;|<br\b[^>]*>)*<\/p>/gi, "");
						const dom = new DOMParser().parseFromString(
							normalized,
							"text/html",
						);
						selection.insertNodes($generateNodesFromDOM(editor, dom));
						return true;
					}
					if (!text) return false;
					event.preventDefault();
					const container = $createQuoteNode();
					importMarkdown(text, container);
					selection.insertNodes(container.getChildren());
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		);
	}, [editor, t]);
	return null;
}
