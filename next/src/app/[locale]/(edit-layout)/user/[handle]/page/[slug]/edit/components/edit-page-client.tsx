"use client";

import type { SanitizedUser } from "@/app/types";
import type { Tag } from "@prisma/client";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";
import { useActionState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useDebouncedCallback } from "use-debounce";
import type { PageWithTitleAndTags } from "../db/queries.server";
import { useKeyboardVisible } from "../hooks/use-keyboard-visible";
import {
	type EditPageContentActionState,
	editPageContentAction,
} from "./action";
import { Editor } from "./editor/editor";
import { EditorKeyboardMenu } from "./editor/editor-keyboard-menu";
import { EditHeader } from "./header";
import { TagInput } from "./tag-input";

interface EditPageClientProps {
	currentUser: SanitizedUser;
	pageWithTitleAndTags: PageWithTitleAndTags;
	allTags: Tag[];
	initialTitle: string | undefined;
	slug: string;
}

export function EditPageClient({
	currentUser,
	pageWithTitleAndTags,
	allTags,
	initialTitle,
	slug,
}: EditPageClientProps) {
	const formRef = useRef<HTMLFormElement>(null);
	const isKeyboardVisible = useKeyboardVisible();
	const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(
		null,
	);
	const [editState, editAction, isEditing] = useActionState<
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
			style={{
				height: "calc(100 * var(--svh, 1svh))",
			}}
			id="root"
		>
			<EditHeader
				currentUser={currentUser}
				initialStatus={pageWithTitleAndTags?.status || "DRAFT"}
				hasUnsavedChanges={hasUnsavedChanges}
				pageId={pageWithTitleAndTags?.id}
			/>
			<main
				className="w-full max-w-3xl prose dark:prose-invert sm:prose lg:prose-lg 
          mx-auto px-4  prose-headings:text-gray-700 prose-headings:dark:text-gray-200 text-gray-700 dark:text-gray-200 mb-5 mt-3 md:mt-5 flex-grow tracking-wider"
			>
				<div className="">
					<h1 className="!m-0 ">
						<TextareaAutosize
							value={title}
							onChange={handleTitleChange}
							onKeyDown={handleTitleKeyDown}
							name="title"
							placeholder="Title"
							className="w-full outline-none bg-transparent resize-none overflow-hidden"
							minRows={1}
							maxRows={10}
							data-testid="title-input"
						/>
					</h1>
					{editState.zodErrors?.title && (
						<p className="text-sm text-red-500">{editState.zodErrors.title}</p>
					)}
					<TagInput
						initialTags={
							pageWithTitleAndTags?.tagPages.map((tagPage) => ({
								id: tagPage.tagId,
								name: tagPage.tag.name,
							})) || []
						}
						allTags={allTags}
						pageId={pageWithTitleAndTags?.id}
					/>
				</div>
				<form action={editAction} ref={formRef}>
					<input type="hidden" name="slug" value={slug} />
					<input type="hidden" name="title" value={title} />
					<Editor
						defaultValue={pageWithTitleAndTags?.content || ""}
						name="pageContent"
						onEditorUpdate={handleChange}
						onEditorCreate={setEditorInstance}
						className="outline-none"
						placeholder="Write to the world..."
					/>
				</form>
				{editState.zodErrors?.pageContent && (
					<p className="text-sm text-red-500">
						{editState.zodErrors.pageContent}
					</p>
				)}
			</main>
			{editorInstance && <EditorKeyboardMenu editor={editorInstance} />}
		</div>
	);
}
