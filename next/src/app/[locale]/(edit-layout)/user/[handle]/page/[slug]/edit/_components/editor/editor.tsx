"use client";
import type { JsonValue } from "@prisma/client/runtime/library";
import { EditorContent, useEditor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { useRef } from "react";
import { EditorBubbleMenu } from "./editor-bubble-menu";
import { configureEditor } from "./editor-config";
import { EditorFloatingMenu } from "./editor-floating-menu";
interface EditorProps {
	defaultValue: JsonValue | undefined;
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
	const contentJson = (defaultValue ?? {
		type: "doc",
		content: [],
	}) as unknown as JSONContent;
	const editorRef = useRef<HTMLInputElement>(null);
	const editor = useEditor({
		...configureEditor(contentJson, placeholder),
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
	const jsonString = JSON.stringify(
		editor?.getJSON ? editor.getJSON() : contentJson,
	);
	return (
		<div className="">
			{editor && <EditorBubbleMenu editor={editor} />}
			{editor && <EditorFloatingMenu editor={editor} />}
			<EditorContent editor={editor} />
			<input type="hidden" name={name} ref={editorRef} value={jsonString} />
		</div>
	);
}
