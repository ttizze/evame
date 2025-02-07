import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { BubbleMenu, type Editor as TiptapEditor } from "@tiptap/react";
import {
	Bold,
	ChevronDown,
	Code,
	Heading2,
	Heading3,
	Heading4,
	Italic,
	List,
	ListOrdered,
	Quote,
	Strikethrough,
	Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/utils/cn";

interface EditorBubbleMenuProps {
	editor: TiptapEditor;
}

const editorCommands: Record<string, (editor: TiptapEditor) => boolean> = {
	bold: (editor) => editor.chain().focus().toggleBold().run(),
	italic: (editor) => editor.chain().focus().toggleItalic().run(),
	strike: (editor) => editor.chain().focus().toggleStrike().run(),
	code: (editor) => editor.chain().focus().toggleCode().run(),
	codeBlock: (editor) => editor.chain().focus().toggleCodeBlock().run(),
	regularText: (editor) => editor.chain().focus().setParagraph().run(),
	h2: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
	h3: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
	h4: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
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

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
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
	const containerRef = useRef(null);

	const currentHeadingLevel = [2, 3, 4].find((level) =>
		editor.isActive("heading", { level }),
	);
	const HeadingIcon = currentHeadingLevel
		? headingIcons[currentHeadingLevel]
		: headingIcons.regular;

	return (
		<BubbleMenu
			editor={editor}
			tippyOptions={{
				duration: 100,
				arrow: false,
				theme: "custom-transparent",
				interactive: true,
			}}
		>
			<div ref={containerRef} className="flex items-center">
				<TooltipProvider>
					<div className="flex items-center">
						<DropdownMenuPrimitive.Root modal={false}>
							<DropdownMenuPrimitive.Trigger
								className={cn(
									"flex h-9 w-9 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground items-start rounded-md",
									editor.isActive("heading") && "bg-secondary text-foreground",
								)}
							>
								<div className="rounded-md flex h-8 w-8 mx-0.5 items-center">
									<HeadingIcon className="h-5 w-5 mr-0.5" />
									<ChevronDown className="h-3 w-3" />
								</div>
							</DropdownMenuPrimitive.Trigger>
							<DropdownMenuPrimitive.Portal container={containerRef.current}>
								<DropdownMenuPrimitive.Content
									className="p-2 z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-0 data-[side=top]:slide-in-from-bottom-2"
									side="bottom"
									align="start"
									sideOffset={6}
								>
									<DropdownMenuPrimitive.Item
										onSelect={() => editorCommands.regularText(editor)}
										className={cn(
											"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
											!editor.isActive("heading") && "bg-secondary",
										)}
									>
										<Type className="h-5 w-5 mr-2" />
										<span>Regular text</span>
									</DropdownMenuPrimitive.Item>
									{[2, 3, 4].map((level) => {
										const Icon = headingIcons[level];
										return (
											<DropdownMenuPrimitive.Item
												key={level}
												onSelect={() => editorCommands[`h${level}`](editor)}
												className={cn(
													"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
													editor.isActive("heading", { level }) &&
														"bg-secondary",
												)}
											>
												<Icon className="h-5 w-5 mr-2" />
												<span>Heading {level}</span>
											</DropdownMenuPrimitive.Item>
										);
									})}
								</DropdownMenuPrimitive.Content>
							</DropdownMenuPrimitive.Portal>
						</DropdownMenuPrimitive.Root>
						{items.map(({ value, icon: Icon, isActive, label }) => (
							<Tooltip key={value}>
								<TooltipTrigger>
									<button
										type="button"
										onClick={() => editorCommands[value](editor)}
										className={cn(
											"rounded-md inline-flex h-8 w-8 mx-0.5 items-center justify-center text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
											isActive() && "bg-secondary text-foreground",
										)}
									>
										<Icon className="h-5 w-5" />
									</button>
								</TooltipTrigger>
								<TooltipContent className="flex items-center px-3 py-3 bg-background border">
									{label}
								</TooltipContent>
							</Tooltip>
						))}
					</div>
				</TooltipProvider>
			</div>
		</BubbleMenu>
	);
}
