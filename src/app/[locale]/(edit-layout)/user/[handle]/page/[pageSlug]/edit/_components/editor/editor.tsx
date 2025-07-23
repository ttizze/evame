"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import { useRef } from "react";
import { EditorBubbleMenu } from "./editor-bubble-menu.client";
import { configureEditor } from "./editor-config";
import { EditorFloatingMenu } from "./editor-floating-menu";

interface EditorProps {
	defaultValue: string;
	name: string;
	onEditorUpdate?: (editor: ReturnType<typeof useEditor>) => void;
	onEditorCreate?: (editor: ReturnType<typeof useEditor>) => void;
	className: string;
	placeholder: string;
}

export function Editor({
	defaultValue,
	name,
	onEditorUpdate,
	onEditorCreate,
	className,
	placeholder,
}: EditorProps) {
	const editorRef = useRef<HTMLInputElement>(null);
	const baseConfig = configureEditor(defaultValue, placeholder);
	const editor = useEditor({
		...baseConfig,
		onCreate: ({ editor }) => {
			if (editorRef.current) {
				editorRef.current.value = editor.getHTML();
			}
			onEditorCreate?.(editor);
		},
		onUpdate: async ({ editor }) => {
			onEditorUpdate?.(editor);
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
		<div className="">
			{editor && <EditorBubbleMenu editor={editor} />}
			{editor && <EditorFloatingMenu editor={editor} />}
			<EditorContent editor={editor} />
			<input
				name={name}
				ref={editorRef}
				type="hidden"
				value={editor?.getHTML() ?? defaultValue ?? ""}
			/>
		</div>
	);
}
