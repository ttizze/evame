import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState, useTransition } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useDebouncedCallback } from "use-debounce";
import { useTranslations } from "use-intl";
import { Editor } from "@/app/[locale]/_components/editor/editor";
import type { SanitizedUser } from "@/app/types";
import type {
	PageWithTitleAndTags,
	TagWithCount,
} from "../../_db/queries.server";
import { useKeyboardVisible } from "../../_hooks/use-keyboard-visible";
import { EditHeader } from "../header/client";
import type { TranslationContext } from "../header/translation-settings/types";
import { TagInput } from "../tag-input";
import { type EditPageContentActionState, editPageContent } from "./action";

interface EditPageClientProps {
	currentUser: SanitizedUser;
	pageWithTitleAndTags: PageWithTitleAndTags;
	allTagsWithCount: TagWithCount[];
	initialTitle: string | undefined;
	pageSlug: string;
	userLocale: string;
	markdown: string;
	targetLocales: string[];
	translationContexts: TranslationContext[];
	handle: string;
}

/** タイトルとMarkdown本文の変更をまとめ、オンラインの保存状態を表示する。 */
export function EditPageClient({
	currentUser,
	pageWithTitleAndTags,
	allTagsWithCount,
	initialTitle,
	pageSlug,
	userLocale,
	markdown,
	targetLocales,
	translationContexts,
	handle,
}: EditPageClientProps) {
	const router = useRouter();
	const t = useTranslations("Editor");
	const formRef = useRef<HTMLFormElement>(null);
	const isKeyboardVisible = useKeyboardVisible();
	const [editState, setEditState] = useState<EditPageContentActionState>({
		success: false,
	});
	const [isEditing, startEditing] = useTransition();
	const editPageContentFn = useServerFn(editPageContent);
	const [title, setTitle] = useState(initialTitle ?? "");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const debouncedSubmit = useDebouncedCallback(() => {
		formRef.current?.requestSubmit();
	}, 3000);
	const saving = useRef(false);
	const changeVersion = useRef(0);

	/** 保存を直列化し、送信中の追加入力は保存済みにせず次の送信へ回す。 */
	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (saving.current) return;
		saving.current = true;
		const version = changeVersion.current;
		const formData = new FormData(event.currentTarget);
		startEditing(async () => {
			try {
				const result = await editPageContentFn({ data: formData });
				setEditState(result);
				if (result.success) {
					setHasUnsavedChanges(changeVersion.current !== version);
					await router.invalidate({ sync: true });
				}
			} catch {
				setEditState({ success: false, message: "Failed to save page" });
			} finally {
				saving.current = false;
				if (changeVersion.current !== version) debouncedSubmit();
			}
		});
	}

	function handleChange() {
		changeVersion.current++;
		setHasUnsavedChanges(true);
		debouncedSubmit();
	}

	function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		// ペースト等で改行が混ざってもタイトルに残さない（Enter は onKeyDown で抑止済み）。
		setTitle(e.target.value.replace(/\r\n|\r|\n/g, " "));
		handleChange();
	}

	/** タイトルのEnterで改行せず、本文の先頭へカーソルを移す。 */
	function handleTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if (e.key === "Enter") {
			e.preventDefault();
			const body = formRef.current?.querySelector<HTMLElement>(
				'[contenteditable="true"]',
			);
			if (body) {
				body.focus();
				const range = document.createRange();
				range.selectNodeContents(body);
				range.collapse(true);
				const selection = window.getSelection();
				selection?.removeAllRanges();
				selection?.addRange(range);
			}
		}
	}

	return (
		<div
			className={`overflow-y-scroll overflow-x-hidden flex flex-col ${isKeyboardVisible ? "overscroll-y-contain" : null}`}
			id="root"
			style={{
				height: "calc(100 * var(--svh, 1svh))",
			}}
		>
			<EditHeader
				currentUser={currentUser}
				handle={handle}
				hasUnsavedChanges={hasUnsavedChanges}
				initialStatus={pageWithTitleAndTags?.status || "DRAFT"}
				isSaving={isEditing}
				locale={userLocale}
				pageId={pageWithTitleAndTags?.id}
				pageSlug={pageSlug}
				targetLocales={targetLocales}
				translationContexts={translationContexts}
			/>
			<main className="px-4 md:px-12 grow">
				<div className="w-full max-w-3xl prose dark:prose-invert sm:prose lg:prose-lg mx-auto prose-headings:text-gray-700 dark:prose-headings:text-gray-200 text-gray-700 dark:text-gray-200 mb-5 mt-3 md:mt-5 tracking-wider">
					<div>
						<h1 className="m-0!">
							<TextareaAutosize
								className="w-full outline-hidden bg-transparent resize-none overflow-hidden"
								data-testid="title-input"
								maxRows={10}
								minRows={1}
								name="title"
								onChange={handleTitleChange}
								onKeyDown={handleTitleKeyDown}
								placeholder={t("title")}
								value={title}
							/>
						</h1>
						{!editState.success && editState.zodErrors?.title && (
							<p className="text-sm text-red-500">
								{editState.zodErrors.title.join(", ")}
							</p>
						)}
						<TagInput
							allTagsWithCount={allTagsWithCount}
							initialTags={
								pageWithTitleAndTags?.tagPages.map((tagPage) => ({
									name: tagPage.tag.name,
								})) ?? []
							}
							pageId={pageWithTitleAndTags?.id}
						/>
					</div>
					<form id="edit-page-form" onSubmit={handleSubmit} ref={formRef}>
						<input name="pageSlug" type="hidden" value={pageSlug} />
						<input name="title" type="hidden" value={title} />
						<input name="userLocale" type="hidden" value={userLocale} />
						<Editor
							className="outline-hidden"
							defaultValue={markdown}
							name="pageContent"
							onChange={handleChange}
							placeholder={t("placeholder")}
							showMenus
						/>
					</form>
					{!editState.success && editState.message && (
						<p className="text-sm text-red-500" role="alert">
							{t("saveFailed")}
						</p>
					)}
					{!editState.success && editState.zodErrors?.pageContent && (
						<p className="text-sm text-red-500">
							{editState.zodErrors.pageContent.join(", ")}
						</p>
					)}
				</div>
			</main>
		</div>
	);
}
