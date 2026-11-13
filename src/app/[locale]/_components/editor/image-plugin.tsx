import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { DRAG_DROP_PASTE } from "@lexical/rich-text";
import { $insertNodeToNearestRoot, mergeRegister } from "@lexical/utils";
import {
	$create,
	$getNodeByKey,
	$getSelection,
	$isRangeSelection,
	$setState,
	COMMAND_PRIORITY_HIGH,
	createCommand,
	PASTE_COMMAND,
} from "lexical";
import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { callReaderAction } from "@/app/_service/reader-action";
import { getXPostId } from "@/app/[locale]/_domain/get-x-post-id";
import { $isArticleTitleSelection } from "./article-title";
import {
	ImageNode,
	imageState,
	TweetNode,
	tweetState,
	UPLOADING_IMAGE_SRC,
} from "./media-nodes";

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
				editor.update(() => $getNodeByKey(key)?.remove());
				window.alert(t("imageUploadFailed"));
			}
		}
		return mergeRegister(
			editor.registerCommand(
				UPLOAD_IMAGE_COMMAND,
				(file) => {
					if (!$isArticleTitleSelection()) void upload(file);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				DRAG_DROP_PASTE,
				(files) => {
					const images = files.filter((file) => file.type.startsWith("image/"));
					if (!images.length) return false;
					if (!$isArticleTitleSelection())
						for (const file of images) void upload(file);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				PASTE_COMMAND,
				(event) => {
					if (!(event instanceof ClipboardEvent)) return false;
					const text = event.clipboardData?.getData("text/plain").trim() ?? "";
					if (getXPostId(text) === null || $isArticleTitleSelection())
						return false;
					event.preventDefault();
					$insertNodeToNearestRoot(
						$setState($create(TweetNode), tweetState, text),
					);
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		);
	}, [editor, t]);
	return null;
}
