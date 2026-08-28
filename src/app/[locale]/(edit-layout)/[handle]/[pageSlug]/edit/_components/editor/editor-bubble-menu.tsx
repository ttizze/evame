"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { LucideIcon } from "lucide-react";
import {
	ArrowUpFromLineIcon,
	Bold,
	ChevronDown,
	Code,
	Heading2,
	Heading3,
	Heading4,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	Quote,
	Strikethrough,
	Type,
} from "lucide-react";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const editorCommands: Record<string, (editor: TiptapEditor) => boolean> = {
	regularText: (editor) => editor.chain().focus().setParagraph().run(),
	h2: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
	h3: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
	h4: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
	bold: (editor) => editor.chain().focus().toggleBold().run(),
	italic: (editor) => editor.chain().focus().toggleItalic().run(),
	strike: (editor) => editor.chain().focus().toggleStrike().run(),
	code: (editor) => editor.chain().focus().toggleCode().run(),
	codeBlock: (editor) => editor.chain().focus().toggleCodeBlock().run(),
	bulletList: (editor) => editor.chain().focus().toggleBulletList().run(),
	orderedList: (editor) => editor.chain().focus().toggleOrderedList().run(),
	blockquote: (editor) => editor.chain().focus().toggleBlockquote().run(),
};

const headingIcons: Record<string | number, LucideIcon> = {
	regular: Type,
	2: Heading2,
	3: Heading3,
	4: Heading4,
};

function useEditorStore(editor: TiptapEditor) {
	const counterRef = useRef(0);
	const subscribe = useCallback(
		(cb: () => void) => {
			const handler = () => {
				counterRef.current++;
				cb();
			};
			editor.on("selectionUpdate", handler);
			return () => {
				editor.off("selectionUpdate", handler);
			};
		},
		[editor],
	);
	useSyncExternalStore(subscribe, () => counterRef.current);
}

export function EditorBubbleMenu({ editor }: { editor: TiptapEditor }) {
	useEditorStore(editor);

	const items = [
		{
			value: "bold",
			label: "Bold",
			icon: Bold,
			isActive: () => editor.isActive("bold"),
		},
		{
			value: "italic",
			label: "Italic",
			icon: Italic,
			isActive: () => editor.isActive("italic"),
		},
		{
			value: "strike",
			label: "Strikethrough",
			icon: Strikethrough,
			isActive: () => editor.isActive("strike"),
		},
		{
			value: "blockquote",
			label: "Blockquote",
			icon: Quote,
			isActive: () => editor.isActive("blockquote"),
		},
		{
			value: "codeBlock",
			label: "Code Block",
			icon: Code,
			isActive: () => editor.isActive("codeBlock"),
		},
		{
			value: "bulletList",
			label: "Bullet List",
			icon: List,
			isActive: () => editor.isActive("bulletList"),
		},
		{
			value: "orderedList",
			label: "Ordered List",
			icon: ListOrdered,
			isActive: () => editor.isActive("orderedList"),
		},
	];

	const currentHeadingLevel = [2, 3, 4].find((level) =>
		editor.isActive("heading", { level }),
	);
	const HeadingIcon = currentHeadingLevel
		? headingIcons[currentHeadingLevel]
		: headingIcons.regular;

	return (
		<BubbleMenu
			editor={editor}
			shouldShow={() => !editor.state.selection.empty}
		>
			<div className="flex items-center rounded-lg border bg-background p-1 shadow-md">
				<TooltipProvider>
					<DropdownMenuPrimitive.Root modal={false}>
						<DropdownMenuPrimitive.Trigger asChild>
							<button
								className={cn(
									"flex h-8 w-9 items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground",
									editor.isActive("heading") && "bg-secondary text-foreground",
								)}
								type="button"
							>
								<HeadingIcon className="mr-0.5 h-5 w-5" />
								<ChevronDown className="h-3 w-3" />
							</button>
						</DropdownMenuPrimitive.Trigger>

						<DropdownMenuPrimitive.Portal>
							<DropdownMenuPrimitive.Content
								align="start"
								className="isolate z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-2 text-popover-foreground shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-0 data-[side=top]:slide-in-from-bottom-2"
								side="bottom"
								sideOffset={6}
							>
								<DropdownMenuPrimitive.Item
									className={cn(
										"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
										!editor.isActive("heading") && "bg-secondary",
									)}
									onSelect={() => editorCommands.regularText(editor)}
								>
									<Type className="mr-2 h-5 w-5" />
									<span>Regular text</span>
								</DropdownMenuPrimitive.Item>
								{[2, 3, 4].map((level) => {
									const Icon = headingIcons[level];
									return (
										<DropdownMenuPrimitive.Item
											className={cn(
												"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden transition-colors focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
												editor.isActive("heading", { level }) && "bg-secondary",
											)}
											key={level}
											onSelect={() => editorCommands[`h${level}`](editor)}
										>
											<Icon className="mr-2 h-5 w-5" /> Heading {level}
										</DropdownMenuPrimitive.Item>
									);
								})}
							</DropdownMenuPrimitive.Content>
						</DropdownMenuPrimitive.Portal>
					</DropdownMenuPrimitive.Root>

					{items.map(({ value, icon: Icon, isActive, label }) => (
						<Tooltip key={value}>
							<TooltipTrigger asChild>
								<button
									className={cn(
										"mx-0.5 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground",
										isActive() && "bg-secondary text-foreground",
									)}
									onClick={() => editorCommands[value](editor)}
									type="button"
								>
									<Icon className="h-5 w-5" />
								</button>
							</TooltipTrigger>
							<TooltipContent className="border bg-background px-3 py-3">
								{label}
							</TooltipContent>
						</Tooltip>
					))}

					<LinkButton editor={editor} />
				</TooltipProvider>
			</div>
		</BubbleMenu>
	);
}

function LinkButton({ editor }: { editor: TiptapEditor }) {
	const inputRef = useRef<HTMLInputElement>(null);

	const apply = () => {
		const href = inputRef.current?.value.trim() ?? "";
		href
			? editor.chain().focus().setLink({ href }).run()
			: editor.chain().focus().unsetLink().run();
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					className={cn(
						"mx-0.5 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground",
						editor.isActive("link") && "bg-secondary text-foreground",
					)}
					type="button"
				>
					<LinkIcon className="h-5 w-5" />
				</button>
			</PopoverTrigger>
			<PopoverContent className="rounded-xl border bg-background p-4">
				<div className="flex gap-2">
					<Input
						className="flex-1 rounded-md border px-2 py-1"
						defaultValue={editor.getAttributes("link").href ?? ""}
						placeholder="URL"
						ref={inputRef}
					/>
					<Button className="px-3" onClick={apply} type="button">
						<ArrowUpFromLineIcon className="h-5 w-5" />
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
