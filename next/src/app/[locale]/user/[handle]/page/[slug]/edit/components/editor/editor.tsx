"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import { useRef } from "react";
import { EditorBubbleMenu } from "./editor-bubble-menu";
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
	const editor = useEditor({
		...configureEditor(defaultValue, placeholder),
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
			attributes: {
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
				type="hidden"
				name={name}
				ref={editorRef}
				value={editor?.getHTML() ?? defaultValue ?? ""}
			/>
		</div>
	);
}
