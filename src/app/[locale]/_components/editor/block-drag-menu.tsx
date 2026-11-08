import { DraggableBlockPlugin_EXPERIMENTAL } from "@lexical/react/LexicalDraggableBlockPlugin";
import { GripVertical } from "lucide-react";
import { useRef } from "react";
import { useTranslations } from "use-intl";

/** 並べ替えと挿入位置の判定はLexicalに任せ、ハンドルの表示だけを担当する。 */
export function BlockDragMenu({
	anchorElement,
}: {
	anchorElement: HTMLElement;
}) {
	const menu = useRef<HTMLButtonElement>(null);
	const targetLine = useRef<HTMLDivElement>(null);
	const t = useTranslations("Editor");
	return (
		<DraggableBlockPlugin_EXPERIMENTAL
			anchorElem={anchorElement}
			isOnMenu={(element) => menu.current?.contains(element) ?? false}
			menuComponent={
				<button
					aria-label={t("moveBlock")}
					className="absolute top-0 left-0 z-30 h-7 w-6 cursor-grab select-none items-center justify-center rounded text-muted-foreground hover:bg-secondary active:cursor-grabbing max-md:hidden!"
					data-testid="editor-drag-handle"
					draggable
					onDragStart={(event) => {
						// Safariでもドロップを受け取れるよう、標準の文字列形式も添える。
						event.dataTransfer.setData("text/plain", "");
					}}
					ref={menu}
					style={{ display: "none" }}
					tabIndex={-1}
					title={t("moveBlock")}
					type="button"
				>
					<GripVertical className="pointer-events-none h-4 w-4" />
				</button>
			}
			menuRef={menu}
			onElementChanged={(element) => {
				// 空行の左側は既存の挿入ボタンに使い、ハンドルとの重なりを防ぐ。
				if (menu.current)
					menu.current.style.visibility = element?.matches(
						"p:empty, p:has(> br:only-child)",
					)
						? "hidden"
						: "visible";
			}}
			targetLineComponent={
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 left-0 z-30 h-1 rounded bg-primary opacity-0"
					data-testid="editor-drop-line"
					ref={targetLine}
				/>
			}
			targetLineRef={targetLine}
		/>
	);
}
