"use client";

import { useServerFn } from "@tanstack/react-start";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useCallback, useRef, useState, useTransition } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useDebouncedCallback } from "use-debounce";
import type { SanitizedUser } from "@/app/types";
import type {
	PageWithTitleAndTags,
	TagWithCount,
} from "../../_db/queries.server";
import { useKeyboardVisible } from "../../_hooks/use-keyboard-visible";
import { Editor } from "../editor/editor";
import { EditorKeyboardMenu } from "../editor/editor-keyboard-menu";
import { EditHeader } from "../header/client";
import type { TranslationContext } from "../header/translation-settings/types";
import { TagInput } from "../tag-input";
import { type EditPageContentActionState, editPageContent } from "./action";

interface EditPageClientProps {
	currentUser: SanitizedUser;
	pageWithTitleAndTags: NonNullable<PageWithTitleAndTags>;
	allTagsWithCount: TagWithCount[];
	initialTitle: string | undefined;
	pageSlug: string;
	userLocale: string;
	html: string;
	targetLocales: string[];
	translationContexts: TranslationContext[];
	handle: string;
}

export function EditPageClient({
	currentUser,
	pageWithTitleAndTags,
	allTagsWithCount,
	initialTitle,
	pageSlug,
	userLocale,
	html,
	targetLocales,
	translationContexts,
	handle,
}: EditPageClientProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const isKeyboardVisible = useKeyboardVisible();
	const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(
		null,
	);
	const [editState, setEditState] = useState<EditPageContentActionState>({
		success: false,
	});
	const [isEditing, startEditing] = useTransition();
	const editPageContentFn = useServerFn(editPageContent);
	const [title, setTitle] = useState(initialTitle ?? "");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const handleSubmit = useCallback(
		(event: React.FormEvent<HTMLFormElement>) => {
			event.preventDefault();
			const formData = new FormData(event.currentTarget);
			startEditing(async () => {
				const result = await editPageContentFn({ data: formData });
				setEditState(result);
				if (result.success) {
					setHasUnsavedChanges(false);
				}
			});
		},
		[editPageContentFn],
	);

	const debouncedSubmit = useDebouncedCallback(() => {
		formRef.current?.requestSubmit();
	}, 3000);

	const handleChange = useCallback(() => {
		setHasUnsavedChanges(true);
		debouncedSubmit();
	}, [debouncedSubmit]);

	const handleTitleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			// ペースト等で改行が混ざってもタイトルに残さない（Enter は onKeyDown で抑止済み）。
			setTitle(e.target.value.replace(/\r\n|\r|\n/g, " "));
			setHasUnsavedChanges(true);
			debouncedSubmit();
		},
		[debouncedSubmit],
	);

	const handleTitleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter") {
				e.preventDefault();
				if (editorInstance) {
					editorInstance.commands.focus("start");
				}
			}
		},
		[editorInstance],
	);

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
				initialStatus={pageWithTitleAndTags.status || "DRAFT"}
				isSaving={isEditing}
				locale={userLocale}
				pageId={pageWithTitleAndTags.id}
				pageSlug={pageSlug}
				targetLocales={targetLocales}
				translationContexts={translationContexts}
			/>
			<main className="px-4 grow ">
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
								placeholder="Title"
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
							initialTags={pageWithTitleAndTags.tagPages.map((tagPage) => ({
								name: tagPage.tag.name,
							}))}
							pageId={pageWithTitleAndTags.id}
						/>
					</div>
					<form id="edit-page-form" onSubmit={handleSubmit} ref={formRef}>
						<input name="pageSlug" type="hidden" value={pageSlug} />
						<input name="title" type="hidden" value={title} />
						<input name="userLocale" type="hidden" value={userLocale} />
						<Editor
							className="outline-hidden"
							defaultValue={html}
							name="pageContent"
							onEditorCreate={setEditorInstance}
							onEditorUpdate={handleChange}
							placeholder="Write to the world..."
						/>
					</form>
					{!editState.success && editState.zodErrors?.pageContent && (
						<p className="text-sm text-red-500">
							{editState.zodErrors.pageContent.join(", ")}
						</p>
					)}
				</div>
			</main>
			{editorInstance && <EditorKeyboardMenu editor={editorInstance} />}
		</div>
	);
}
