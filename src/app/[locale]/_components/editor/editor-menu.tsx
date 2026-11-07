import { $createCodeNode } from "@lexical/code-core";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
	$isListNode,
	INSERT_CHECK_LIST_COMMAND,
	INSERT_ORDERED_LIST_COMMAND,
	INSERT_UNORDERED_LIST_COMMAND,
	REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
	$createHeadingNode,
	$createQuoteNode,
	$isHeadingNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import { INSERT_TABLE_COMMAND } from "@lexical/table";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
	$createParagraphNode,
	$getRoot,
	$getSelection,
	$isRangeSelection,
	FORMAT_TEXT_COMMAND,
	INDENT_CONTENT_COMMAND,
	OUTDENT_CONTENT_COMMAND,
	type TextFormatType,
} from "lexical";
import {
	ArrowUpFromLineIcon,
	Bold,
	CheckSquare,
	ChevronDown,
	Code,
	Heading2,
	Heading3,
	Heading4,
	ImageIcon,
	IndentDecrease,
	IndentIncrease,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	Plus,
	Quote,
	Strikethrough,
	Table,
	Type,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { UPLOAD_IMAGE_COMMAND } from "./image-plugin";

const blockItems = [
	{ value: "paragraph", icon: Type, label: "paragraph" },
	{ value: "h2", icon: Heading2, label: "heading2" },
	{ value: "h3", icon: Heading3, label: "heading3" },
	{ value: "h4", icon: Heading4, label: "heading4" },
	{ value: "bullet", icon: List, label: "bulletList" },
	{ value: "number", icon: ListOrdered, label: "orderedList" },
	{ value: "check", icon: CheckSquare, label: "checkList" },
	{ value: "quote", icon: Quote, label: "quote" },
	{ value: "code", icon: Code, label: "codeBlock" },
] as const;

const formats = [
	{ value: "bold", icon: Bold, label: "bold" },
	{ value: "italic", icon: Italic, label: "italic" },
	{ value: "strikethrough", icon: Strikethrough, label: "strikethrough" },
	{ value: "code", icon: Code, label: "inlineCode" },
] as const;

/** 選択範囲と空行に応じたツールバーを表示し、書式変更をLexicalの更新内で実行する。 */
export function EditorMenu() {
	const [editor] = useLexicalComposerContext();
	const t = useTranslations("Editor");
	const imageInput = useRef<HTMLInputElement>(null);
	const linkInput = useRef<HTMLInputElement>(null);
	const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(
		null,
	);
	const [view, setView] = useState({
		block: "paragraph",
		formats: [] as TextFormatType[],
		href: "",
		bubble: null as { top: number; left: number } | null,
		floating: null as { top: number; left: number } | null,
	});
	useEffect(() => {
		const update = () =>
			editor.getEditorState().read(() => {
				const selection = $getSelection();
				if (!$isRangeSelection(selection)) return;
				const anchor = selection.anchor.getNode();
				const block = anchor.getTopLevelElement() ?? $getRoot().getFirstChild();
				if (!block) return;
				const element = editor.getElementByKey(block.getKey());
				const domSelection = window.getSelection();
				const range = domSelection?.rangeCount
					? domSelection.getRangeAt(0)
					: null;
				const rect =
					range && typeof range.getBoundingClientRect === "function"
						? range.getBoundingClientRect()
						: null;
				const blockRect = element?.getBoundingClientRect();
				const parent = anchor.getParent();
				const link = $isLinkNode(anchor)
					? anchor
					: $isLinkNode(parent)
						? parent
						: null;
				setView({
					block: $isHeadingNode(block)
						? block.getTag()
						: $isListNode(block)
							? block.getListType()
							: block.getType(),
					formats: formats
						.filter(({ value }) => selection.hasFormat(value))
						.map(({ value }) => value),
					href: link?.getURL() ?? "",
					bubble:
						!selection.isCollapsed() && rect
							? {
									top: Math.max(8, rect.top - 48),
									left: Math.max(
										8,
										Math.min(rect.left, window.innerWidth - 390),
									),
								}
							: null,
					floating:
						selection.isCollapsed() &&
						block.getType() === "paragraph" &&
						block.getTextContent() === "" &&
						blockRect
							? { top: blockRect.top, left: Math.max(0, blockRect.left - 48) }
							: null,
				});
			});
		const remove = editor.registerUpdateListener(update);
		document.addEventListener("scroll", update, true);
		window.addEventListener("resize", update);
		return () => {
			remove();
			document.removeEventListener("scroll", update, true);
			window.removeEventListener("resize", update);
		};
	}, [editor]);

	/** リストと表は専用コマンドを使い、それ以外は選択ブロックを変換する。 */
	function applyBlock(value: (typeof blockItems)[number]["value"]) {
		if (value === "bullet" || value === "number" || value === "check") {
			editor.dispatchCommand(
				view.block === value
					? REMOVE_LIST_COMMAND
					: value === "bullet"
						? INSERT_UNORDERED_LIST_COMMAND
						: value === "number"
							? INSERT_ORDERED_LIST_COMMAND
							: INSERT_CHECK_LIST_COMMAND,
				undefined,
			);
		} else {
			editor.update(() => {
				const selection = $getSelection();
				if ($isRangeSelection(selection))
					$setBlocksType(selection, () => {
						if (view.block === value || value === "paragraph")
							return $createParagraphNode();
						if (value === "quote") return $createQuoteNode();
						if (value === "code") return $createCodeNode();
						return $createHeadingNode(value);
					});
			});
		}
		editor.focus();
	}

	const HeadingIcon =
		blockItems.find(({ value }) => value === view.block)?.icon ?? Type;
	return (
		<>
			{view.bubble && (
				<div
					className="fixed z-50 flex items-center rounded-lg border bg-background p-1 shadow-md"
					data-testid="editor-bubble-menu"
					style={view.bubble}
				>
					<DropdownMenu.Root modal={false}>
						<DropdownMenu.Trigger asChild>
							<button
								aria-label={t("blockType")}
								className="flex h-8 w-9 items-center rounded-md hover:bg-secondary"
								type="button"
							>
								<HeadingIcon className="h-5 w-5" />
								<ChevronDown className="h-3 w-3" />
							</button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Portal>
							<DropdownMenu.Content
								align="start"
								className="z-50 rounded-md border bg-popover p-2 shadow-md"
								side="bottom"
								sideOffset={6}
							>
								{blockItems.map(({ value, icon: Icon, label }) => (
									<DropdownMenu.Item
										className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent"
										key={value}
										onSelect={() => applyBlock(value)}
									>
										<Icon className="mr-2 h-5 w-5" />
										{t(label)}
									</DropdownMenu.Item>
								))}
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>
					{formats.map(({ value, icon: Icon, label }) => (
						<button
							aria-label={t(label)}
							aria-pressed={view.formats.includes(value)}
							className={cn(
								"mx-0.5 flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary",
								view.formats.includes(value) && "bg-secondary",
							)}
							key={value}
							onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, value)}
							onPointerDown={(event) => event.preventDefault()}
							title={t(label)}
							type="button"
						>
							<Icon className="h-5 w-5" />
						</button>
					))}
					{blockItems
						.filter(({ value }) =>
							["quote", "code", "bullet", "number"].includes(value),
						)
						.map(({ value, icon: Icon, label }) => (
							<button
								aria-label={t(label)}
								aria-pressed={view.block === value}
								className={cn(
									"mx-0.5 flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary",
									view.block === value && "bg-secondary",
								)}
								key={value}
								onClick={() => applyBlock(value)}
								onPointerDown={(event) => event.preventDefault()}
								title={t(label)}
								type="button"
							>
								<Icon className="h-5 w-5" />
							</button>
						))}
					<Popover>
						<PopoverTrigger asChild>
							<button
								aria-label={t("link")}
								className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-secondary"
								type="button"
							>
								<LinkIcon className="h-5 w-5" />
							</button>
						</PopoverTrigger>
						<PopoverContent className="border bg-background p-4">
							<div className="flex gap-2">
								<Input
									aria-label={t("linkUrl")}
									defaultValue={view.href}
									placeholder="URL"
									ref={linkInput}
								/>
								<Button
									aria-label={t("applyLink")}
									onClick={() => {
										editor.dispatchCommand(
											TOGGLE_LINK_COMMAND,
											linkInput.current?.value.trim() || null,
										);
										editor.focus();
									}}
									type="button"
								>
									<ArrowUpFromLineIcon className="h-5 w-5" />
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			)}
			{view.floating && (
				<div
					className="fixed z-40 hidden md:block"
					data-testid="editor-floating-menu"
					ref={setPortalContainer}
					style={view.floating}
				>
					<DropdownMenu.Root modal={false}>
						<DropdownMenu.Trigger asChild>
							<button
								aria-label={t("insertBlock")}
								className="flex h-10 w-10 items-center justify-center rounded-full border bg-background text-muted-foreground hover:bg-secondary"
								type="button"
							>
								<Plus className="h-5 w-5" />
							</button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Portal container={portalContainer ?? undefined}>
							<DropdownMenu.Content
								align="start"
								className="z-50 min-w-48 rounded-md border bg-popover p-2 shadow-md"
								side="right"
								sideOffset={4}
							>
								{blockItems
									.filter(({ value }) => value !== "paragraph")
									.map(({ value, icon: Icon, label }) => (
										<DropdownMenu.Item
											className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent"
											key={value}
											onSelect={() => applyBlock(value)}
										>
											<Icon className="mr-2 h-5 w-5" />
											{t(label)}
										</DropdownMenu.Item>
									))}
								<DropdownMenu.Item
									className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent"
									onSelect={() => imageInput.current?.click()}
								>
									<ImageIcon className="mr-2 h-5 w-5" />
									{t("image")}
								</DropdownMenu.Item>
								<DropdownMenu.Item
									className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent"
									onSelect={() =>
										editor.dispatchCommand(INSERT_TABLE_COMMAND, {
											rows: "3",
											columns: "3",
											includeHeaders: true,
										})
									}
								>
									<Table className="mr-2 h-5 w-5" />
									{t("table")}
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>
				</div>
			)}
			<footer className="fixed inset-x-0 bottom-0 z-40 flex h-12 overflow-x-auto border-t border-border bg-background md:hidden">
				{[
					{
						icon: IndentIncrease,
						command: INDENT_CONTENT_COMMAND,
						label: "indent",
					},
					{
						icon: IndentDecrease,
						command: OUTDENT_CONTENT_COMMAND,
						label: "outdent",
					},
				].map(({ icon: Icon, command, label }) => (
					<button
						aria-label={t(label)}
						className="shrink-0 px-2"
						key={label}
						onClick={() => editor.dispatchCommand(command, undefined)}
						onPointerDown={(event) => event.preventDefault()}
						title={t(label)}
						type="button"
					>
						<Icon className="h-6 w-6" />
					</button>
				))}
				{blockItems
					.filter(({ value }) =>
						["h2", "h3", "h4", "bullet", "number"].includes(value),
					)
					.map(({ value, icon: Icon, label }) => (
						<button
							aria-label={t(label)}
							aria-pressed={view.block === value}
							className={cn(
								"shrink-0 px-2",
								view.block === value && "bg-secondary",
							)}
							key={value}
							onClick={() => applyBlock(value)}
							onPointerDown={(event) => event.preventDefault()}
							title={t(label)}
							type="button"
						>
							<Icon className="h-6 w-6" />
						</button>
					))}
				<button
					aria-label={t("inlineCode")}
					className="shrink-0 px-2"
					onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
					onPointerDown={(event) => event.preventDefault()}
					title={t("inlineCode")}
					type="button"
				>
					<Code className="h-6 w-6" />
				</button>
				<button
					aria-label={t("image")}
					className="shrink-0 px-2"
					onClick={() => imageInput.current?.click()}
					title={t("image")}
					type="button"
				>
					<ImageIcon className="h-6 w-6" />
				</button>
			</footer>
			<input
				accept="image/*"
				aria-label={t("image")}
				className="hidden"
				onChange={(event) => {
					for (const file of event.target.files ?? [])
						editor.dispatchCommand(UPLOAD_IMAGE_COMMAND, file);
					event.target.value = "";
				}}
				ref={imageInput}
				type="file"
			/>
		</>
	);
}
