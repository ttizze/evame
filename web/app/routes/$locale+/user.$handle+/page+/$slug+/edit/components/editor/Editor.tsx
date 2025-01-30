import type { useInputControl } from "@conform-to/react";
import { EditorContent, useEditor } from "@tiptap/react";
import { EditorBubbleMenu } from "./EditorBubbleMenu";
import { EditorFloatingMenu } from "./EditorFloatingMenu";
import { configureEditor } from "./editorConfig";

interface EditorProps {
	defaultValue: string;
	onEditorUpdate?: () => void;
	onEditorCreate?: (editor: ReturnType<typeof useEditor>) => void;
	className: string;
	placeholder: string;
	InputControl: ReturnType<typeof useInputControl>;
}

export function Editor({
	defaultValue,
	onEditorUpdate,
	onEditorCreate,
	className,
	placeholder,
	InputControl,
}: EditorProps) {
	const editor = useEditor({
		...configureEditor(defaultValue, placeholder),
		onCreate: ({ editor }) => {
			InputControl.change(editor.getHTML());
			onEditorCreate?.(editor);
		},
		onUpdate: async ({ editor }) => {
			InputControl.change(editor.getHTML());
			onEditorUpdate?.();
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
		</div>
	);
}
