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
			/>
			<main className="px-4 grow ">
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
									id: tagPage.tag.id,
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
			</main>
			{editorInstance && <EditorKeyboardMenu editor={editorInstance} />}
		</div>
	);
}
