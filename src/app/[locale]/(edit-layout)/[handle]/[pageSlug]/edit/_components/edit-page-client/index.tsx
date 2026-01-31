"use client";

import type { Editor as TiptapEditor } from "@tiptap/react";
import { useActionState, useCallback, useRef, useState } from "react";
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
import {
	type EditPageContentActionState,
	editPageContentAction,
} from "./action";

interface EditPageClientProps {
	currentUser: SanitizedUser;
	pageWithTitleAndTags: PageWithTitleAndTags;
	allTagsWithCount: TagWithCount[];
	initialTitle: string | undefined;
	pageSlug: string;
	userLocale: string;
	html: string;
	targetLocales: string[];
	translationContexts: TranslationContext[];
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
}: EditPageClientProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const isKeyboardVisible = useKeyboardVisible();
	const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(
		null,
	);
	const [editState, editAction, _isEditing] = useActionState<
		EditPageContentActionState,
		FormData
	>(editPageContentAction, { success: false });
	const [title, setTitle] = useState(initialTitle ?? "");
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const debouncedSubmit = useDebouncedCallback(() => {
		formRef.current?.requestSubmit();
		setHasUnsavedChanges(false);
	}, 3000);

	// Debounced change handler to prevent excessive state updates
	const handleChange = useCallback(() => {
		setHasUnsavedChanges(true);
		debouncedSubmit();
	}, [debouncedSubmit]);

	const handleTitleChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setTitle(e.target.value);
			setHasUnsavedChanges(true);
			debouncedSubmit();
		},
		[debouncedSubmit],
	);
	// Handle Enter key in title textarea
	const handleTitleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			// Move to editor when Enter is pressed without Shift key
			if (e.key === "Enter") {
				e.preventDefault(); // Prevent newline in title

				// Focus the editor
				if (editorInstance) {
					// Set focus to the editor
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
				hasUnsavedChanges={hasUnsavedChanges}
				initialStatus={pageWithTitleAndTags?.status || "DRAFT"}
				pageId={pageWithTitleAndTags?.id}
				targetLocales={targetLocales}
				translationContexts={translationContexts}
			/>
			<main className="px-4 grow">
				<div className="mx-auto w-full max-w-5xl lg:flex lg:gap-8">
					<aside className="mt-4 lg:mt-6 lg:w-64 shrink-0">
						<div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-3">
							<p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
								フォルダ
							</p>
							<div className="mt-3">
								<div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-100">
									<span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
										📁
									</span>
									<span className="truncate">
										{title.trim() || "未命名のフォルダ"}
									</span>
								</div>
								<ul className="mt-2 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-6 text-sm text-gray-600 dark:text-gray-300">
									<li className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-100">
										<span className="text-base">📝</span>
										<span>記事</span>
									</li>
									<li className="flex items-center gap-2">
										<span className="text-base">📂</span>
										<span>関連資料</span>
									</li>
									<li className="flex items-center gap-2">
										<span className="text-base">📂</span>
										<span>Plans</span>
									</li>
								</ul>
							</div>
						</div>
					</aside>
					<div
						className="w-full max-w-3xl prose dark:prose-invert sm:prose lg:prose-lg
        mx-auto  prose-headings:text-gray-700 dark:prose-headings:text-gray-200 text-gray-700 dark:text-gray-200 mb-5 mt-3 md:mt-5 tracking-wider"
					>
						<div className="">
							<h1 className="m-0! ">
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
									{editState.zodErrors.title}
								</p>
							)}
							<TagInput
								allTagsWithCount={allTagsWithCount}
								initialTags={
									pageWithTitleAndTags?.tagPages.map((tagPage) => ({
										name: tagPage.tag.name,
									})) || []
								}
								pageId={pageWithTitleAndTags?.id}
							/>
						</div>
						<form action={editAction} ref={formRef}>
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
								{editState.zodErrors.pageContent}
							</p>
						)}
					</div>
				</div>
			</main>
			{editorInstance && <EditorKeyboardMenu editor={editorInstance} />}
		</div>
	);
}
