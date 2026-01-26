import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { Editor } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { FloatingMenu } from "@tiptap/react/menus";
import {
	Code,
	Heading2,
	Heading3,
	Heading4,
	ImageIcon,
	List,
	ListOrdered,
	Plus,
	Quote,
} from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { handleFileUpload } from "./use-file-upload";

interface EditorFloatingMenuProps {
	editor: Editor;
}

const editorCommands: Record<string, (editor: Editor) => boolean> = {
	regularText: (editor) => editor.chain().focus().setParagraph().run(),
	h2: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
	h3: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
	h4: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
	bulletList: (editor) => editor.chain().focus().toggleBulletList().run(),
	orderedList: (editor) => editor.chain().focus().toggleOrderedList().run(),
	blockquote: (editor) => editor.chain().focus().toggleBlockquote().run(),
	codeBlock: (editor) => editor.chain().focus().toggleCodeBlock().run(),
};

const menuItems = [
	{
		value: "h2",
		label: "Heading 2",
		icon: Heading2,
		isActive: (editor: Editor) => editor.isActive("heading", { level: 2 }),
	},
	{
		value: "h3",
		label: "Heading 3",
		icon: Heading3,
		isActive: (editor: Editor) => editor.isActive("heading", { level: 3 }),
	},
	{
		value: "h4",
		label: "Heading 4",
		icon: Heading4,
		isActive: (editor: Editor) => editor.isActive("heading", { level: 4 }),
	},
	{
		value: "bulletList",
		label: "Bullet List",
		icon: List,
		isActive: (editor: Editor) => editor.isActive("bulletList"),
	},
	{
		value: "orderedList",
		label: "Ordered List",
		icon: ListOrdered,
		isActive: (editor: Editor) => editor.isActive("orderedList"),
	},
	{
		value: "blockquote",
		label: "Quote",
		icon: Quote,
		isActive: (editor: Editor) => editor.isActive("blockquote"),
	},
	{
		value: "codeBlock",
		label: "Code Block",
		icon: Code,
		isActive: (editor: Editor) => editor.isActive("codeBlock"),
	},
];

const shouldShowFloatingMenu = (editor: Editor, state: EditorState) => {
	// 空のテキストブロックで、かつカーソルが行頭にある場合のみ表示
	const { selection } = state;
	if (!editor.view.hasFocus() || !selection.empty) {
		return false;
	}

	const { $from } = selection;
	const isAtLineStart = $from.parentOffset === 0;
	const isEmptyTextBlock =
		$from.parent.isTextblock &&
		!$from.parent.type.spec.code &&
		$from.parent.content.size === 0;

	return isAtLineStart && isEmptyTextBlock;
};

export function EditorFloatingMenu({ editor }: EditorFloatingMenuProps) {
	const containerRef = useRef(null);

	return (
		<>
			<FloatingMenu
				className="hidden md:block"
				editor={editor}
				options={{
					strategy: "fixed",
					placement: "left",
				}}
				shouldShow={({ editor, state }) =>
					shouldShowFloatingMenu(editor, state)
				}
			>
				<div className="floating-menu">
					<div ref={containerRef}>
						<DropdownMenuPrimitive.Root modal={false}>
							<DropdownMenuPrimitive.Trigger className="flex h-10 w-10 items-center justify-center rounded-full border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground">
								<Plus className="h-5 w-5" />
							</DropdownMenuPrimitive.Trigger>
							<DropdownMenuPrimitive.Portal container={containerRef.current}>
								<DropdownMenuPrimitive.Content
									align="start"
									className="min-w-[12rem] overflow-hidden rounded-md border bg-popover p-2 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
									side="right"
									sideOffset={4}
								>
									{menuItems.map(({ value, icon: Icon, isActive, label }) => (
										<DropdownMenuPrimitive.Item
											className={cn(
												"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
												isActive(editor) && "bg-secondary",
											)}
											key={value}
											onSelect={() => editorCommands[value](editor)}
										>
											<Icon className="h-5 w-5 mr-2" />
											<span>{label}</span>
										</DropdownMenuPrimitive.Item>
									))}
									<DropdownMenuPrimitive.Item
										className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground"
										onSelect={() =>
											document.getElementById("imageUpload")?.click()
										}
									>
										<ImageIcon className="h-5 w-5 mr-2" />
										<span>Image</span>
									</DropdownMenuPrimitive.Item>
								</DropdownMenuPrimitive.Content>
							</DropdownMenuPrimitive.Portal>
						</DropdownMenuPrimitive.Root>
					</div>
				</div>
			</FloatingMenu>
			<input
				accept="image/*"
				id="imageUpload"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) handleFileUpload(file, editor);
				}}
				style={{ display: "none" }}
				type="file"
			/>
		</>
	);
}
