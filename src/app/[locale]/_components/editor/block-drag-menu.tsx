import { $isListItemNode, $isListNode } from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalEditable } from "@lexical/react/useLexicalEditable";
import {
	$getNodeByKey,
	$getRoot,
	$isElementNode,
	COMMAND_PRIORITY_HIGH,
	DRAGOVER_COMMAND,
	DROP_COMMAND,
	type LexicalNode,
	mergeRegister,
	SKIP_DOM_SELECTION_TAG,
} from "lexical";
import { GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "use-intl";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	$getParentListItem,
	$moveEditorBlock,
	listCommands,
} from "./block-editing";
import { blockItems } from "./editor-menu";

/** 通常ブロックの前後への移動は最上位で行い、元の種類とドロップ線の位置を揃える。 */
export function $getBlockDropTarget(
	targetKey: string,
	isListItemSource: boolean,
	placement: "before" | "after" | "inside",
) {
	let target = $getNodeByKey(targetKey);
	if (!isListItemSource && placement !== "inside") {
		while ($isListItemNode(target)) {
			const owner = $getParentListItem(target);
			if (!owner) break;
			target = owner;
		}
	}
	return target;
}

/** 最上位ブロックと各リスト項目を同じハンドルで扱う。子リストの容器は項目に数えない。 */
export function BlockDragMenu({
	anchorElement,
}: {
	anchorElement: HTMLElement;
}) {
	const [editor] = useLexicalComposerContext();
	const editable = useLexicalEditable();
	const menu = useRef<HTMLButtonElement>(null);
	const line = useRef<HTMLDivElement>(null);
	const hovered = useRef<string | null>(null);
	const dragged = useRef<string | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const t = useTranslations("Editor");
	useEffect(() => {
		function targetAt(
			x: number,
			y: number,
		): { key: string; element: HTMLElement; rect: DOMRect } | null {
			const bounds = editor.getRootElement()?.getBoundingClientRect();
			if (
				!bounds ||
				x < bounds.left ||
				x > bounds.right ||
				y < bounds.top ||
				y > bounds.bottom
			)
				return null;
			return editor.read("latest", () => {
				let nearest: {
					key: string;
					element: HTMLElement;
					rect: DOMRect;
				} | null = null;
				let distance = Infinity;
				function visit(node: LexicalNode) {
					if (
						$isListNode(node) ||
						($isListItemNode(node) && $isListNode(node.getFirstChild()))
					) {
						if ($isElementNode(node))
							for (const child of node.getChildren()) visit(child);
					} else {
						const element = editor.getElementByKey(node.getKey());
						if (!element) return;
						const rect = element.getBoundingClientRect();
						const nextDistance = Math.max(rect.top - y, y - rect.bottom, 0);
						if (rect.height && nextDistance < distance) {
							nearest = { key: node.getKey(), element, rect };
							distance = nextDistance;
						}
					}
				}
				for (const child of $getRoot().getChildren()) visit(child);
				return nearest;
			});
		}
		function dropAt(x: number, y: number, sourceKey: string) {
			const hit = targetAt(x, y);
			if (!hit) return null;
			return editor.read("latest", () => {
				let target = hit;
				let placement: "before" | "after" | "inside" =
					y < target.rect.top + target.rect.height / 2 ? "before" : "after";
				let node = $getNodeByKey(target.key);
				while ($isListItemNode(node) && x < target.rect.left - 24) {
					const owner = $getParentListItem(node);
					if (!owner) break;
					const element = editor.getElementByKey(owner.getKey());
					if (!element) break;
					target = {
						key: owner.getKey(),
						element,
						rect: element.getBoundingClientRect(),
					};
					node = owner;
					placement = "after";
				}
				if (
					$isListItemNode(node) &&
					placement === "after" &&
					x > target.rect.left + 24
				)
					placement = "inside";
				const isListItemSource = $isListItemNode($getNodeByKey(sourceKey));
				const resolved = $getBlockDropTarget(
					target.key,
					isListItemSource,
					placement,
				);
				if (resolved && !resolved.is(node)) {
					const element = editor.getElementByKey(resolved.getKey());
					if (!element) return null;
					target = {
						key: resolved.getKey(),
						element,
						rect: element.getBoundingClientRect(),
					};
					node = resolved;
				}
				let bottom = target.rect.bottom;
				if ($isListItemNode(node) && placement !== "before") {
					let next = node.getNextSibling();
					while ($isListItemNode(next) && $isListNode(next.getFirstChild())) {
						const element = editor.getElementByKey(next.getKey());
						if (element) bottom = element.getBoundingClientRect().bottom;
						next = next.getNextSibling();
					}
				}
				let left = target.rect.left;
				if (placement === "inside") left += 28;
				else if (!isListItemSource && $isListItemNode(node)) {
					const parent = target.element.parentElement;
					if (!parent) return null;
					left = parent.getBoundingClientRect().left;
				}
				return {
					key: target.key,
					placement,
					left,
					top: placement === "before" ? target.rect.top : bottom,
				};
			});
		}
		function hideLine() {
			if (line.current) line.current.style.opacity = "0";
		}
		function move(event: MouseEvent) {
			if (
				menuOpen ||
				dragged.current ||
				(event.target instanceof Node && menu.current?.contains(event.target))
			)
				return;
			const target = targetAt(event.clientX, event.clientY);
			hovered.current = target?.key ?? null;
			const button = menu.current;
			if (!button) return;
			if (
				!target ||
				target.element.matches("p:empty, p:has(> br:only-child)")
			) {
				button.style.display = "none";
				return;
			}
			const anchor = anchorElement.getBoundingClientRect();
			const height =
				Number.parseFloat(getComputedStyle(target.element).lineHeight) ||
				target.rect.height;
			button.style.display = "flex";
			button.style.transform = `translate(${target.rect.left - anchor.left - (target.element.tagName === "LI" ? 48 : 28)}px, ${target.rect.top - anchor.top + (height - 28) / 2 + anchorElement.scrollTop}px)`;
		}
		function leave() {
			if (!dragged.current && !menuOpen && menu.current)
				menu.current.style.display = "none";
		}
		anchorElement.addEventListener("mousemove", move);
		anchorElement.addEventListener("mouseleave", leave);
		return mergeRegister(
			() => {
				anchorElement.removeEventListener("mousemove", move);
				anchorElement.removeEventListener("mouseleave", leave);
			},
			editor.registerCommand(
				DRAGOVER_COMMAND,
				(event) => {
					if (!dragged.current) return false;
					const target = dropAt(event.clientX, event.clientY, dragged.current);
					if (!target || !line.current) {
						hideLine();
						return false;
					}
					const anchor = anchorElement.getBoundingClientRect();
					line.current.style.transform = `translate(${target.left - anchor.left}px, ${target.top - anchor.top + anchorElement.scrollTop}px)`;
					line.current.style.width = `${Math.max(0, anchor.right - target.left)}px`;
					line.current.style.opacity = "0.4";
					event.preventDefault();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
			editor.registerCommand(
				DROP_COMMAND,
				(event) => {
					if (!dragged.current) return false;
					const target = dropAt(event.clientX, event.clientY, dragged.current);
					if (!target) return false;
					event.preventDefault();
					$moveEditorBlock(dragged.current, target.key, target.placement);
					hideLine();
					return true;
				},
				COMMAND_PRIORITY_HIGH,
			),
		);
	}, [editor, anchorElement, menuOpen]);
	return createPortal(
		editable && (
			<>
				<Popover
					onOpenChange={(open) => {
						setMenuOpen(open);
						const key = hovered.current;
						if (open && key)
							editor.update(
								() => {
									const node = $getNodeByKey(key);
									if ($isElementNode(node)) node.selectStart();
								},
								{ tag: SKIP_DOM_SELECTION_TAG, discrete: true },
							);
					}}
					open={menuOpen}
				>
					<PopoverTrigger asChild>
						<button
							aria-label={t("moveBlock")}
							className="absolute top-0 left-0 z-30 h-7 w-6 cursor-grab select-none items-center justify-center rounded text-muted-foreground hover:bg-secondary active:cursor-grabbing max-md:hidden!"
							data-testid="editor-drag-handle"
							draggable
							onDragEnd={() => {
								dragged.current = null;
								if (line.current) line.current.style.opacity = "0";
								editor.focus();
							}}
							onDragStart={(event) => {
								if (!hovered.current) {
									event.preventDefault();
									return;
								}
								dragged.current = hovered.current;
								event.dataTransfer.effectAllowed = "move";
								// WebKitでもdropを発生させ、本文以外では文字を挿入しない。
								event.dataTransfer.setData("text/plain", "");
								const element = editor.getElementByKey(hovered.current);
								if (element) event.dataTransfer.setDragImage(element, 0, 0);
							}}
							ref={menu}
							style={{ display: "none" }}
							tabIndex={-1}
							title={t("moveBlock")}
							type="button"
						>
							<GripVertical className="pointer-events-none h-4 w-4" />
						</button>
					</PopoverTrigger>
					<PopoverContent
						align="start"
						className="z-50 rounded-md border bg-popover p-2 shadow-md"
						onCloseAutoFocus={(event) => {
							event.preventDefault();
							editor.focus();
						}}
					>
						{listCommands.map(({ type, command }) => {
							const item = blockItems.find(({ value }) => value === type);
							if (!item) return null;
							const Icon = item.icon;
							return (
								<button
									className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:bg-accent"
									key={type}
									onClick={() => {
										editor.dispatchCommand(command, undefined);
										setMenuOpen(false);
									}}
									type="button"
								>
									<Icon className="mr-2 h-5 w-5" />
									{t(item.label)}
								</button>
							);
						})}
					</PopoverContent>
				</Popover>
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 left-0 z-30 h-1 rounded bg-primary opacity-0"
					data-testid="editor-drop-line"
					ref={line}
				/>
			</>
		),
		anchorElement,
	);
}
