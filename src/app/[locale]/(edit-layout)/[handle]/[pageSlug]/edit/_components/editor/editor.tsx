"use client";

import { useServerFn } from "@tanstack/react-start";
import type { Editor as TiptapEditor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useRef } from "react";
import { EditorBubbleMenu } from "./editor-bubble-menu";
import { configureEditor } from "./editor-config";
import { EditorFloatingMenu } from "./editor-floating-menu";
import { uploadEditorImage } from "./use-file-upload";

export interface EditorProps {
	defaultValue: string;
	name: string;
	onEditorUpdate?: (editor: TiptapEditor) => void;
	onEditorCreate?: (editor: TiptapEditor) => void;
	className: string;
	placeholder: string;
	/** 文章編集ページでは true、コメント等の軽量用途では false を想定 */
	showMenus?: boolean;
}

export function Editor({
	defaultValue,
	name,
	onEditorUpdate,
	onEditorCreate,
	className,
	placeholder,
	showMenus = true,
}: EditorProps) {
	const editorRef = useRef<HTMLInputElement>(null);
	const uploadImage = useServerFn(uploadEditorImage);
	const baseConfig = configureEditor(defaultValue, placeholder, uploadImage);
	const editor = useEditor({
		...baseConfig,
		onCreate: ({ editor: createdEditor }) => {
			if (editorRef.current) editorRef.current.value = createdEditor.getHTML();
			onEditorCreate?.(createdEditor);
		},
		onUpdate: ({ editor: updatedEditor }) => {
			onEditorUpdate?.(updatedEditor);
		},
		editorProps: {
			...baseConfig.editorProps,
			attributes: {
				...baseConfig.editorProps?.attributes,
				"data-testid": "tiptap-editor",
				class: className,
			},
		},
	});

	return (
		<div>
			{showMenus && editor && <EditorBubbleMenu editor={editor} />}
			{showMenus && editor && (
				<EditorFloatingMenu editor={editor} uploadImage={uploadImage} />
			)}
			<EditorContent editor={editor} />
			<input
				name={name}
				ref={editorRef}
				type="hidden"
				value={editor?.getHTML() ?? defaultValue}
			/>
		</div>
	);
}
