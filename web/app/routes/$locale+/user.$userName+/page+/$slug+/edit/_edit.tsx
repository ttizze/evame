import {
	FormProvider,
	getFormProps,
	getTextareaProps,
	useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/react";
import { useLoaderData } from "@remix-run/react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { useState } from "react";
import { useCallback, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useDebouncedCallback } from "use-debounce";
import { z } from "zod";
import { authenticator } from "~/utils/auth.server";
import { EditHeader } from "./components/EditHeader";
import { TagInput } from "./components/TagInput";
import { Editor } from "./components/editor/Editor";
import { EditorKeyboardMenu } from "./components/editor/EditorKeyboardMenu";
import { upsertTags } from "./functions/mutations.server";
import { getAllTags, getPageBySlug } from "./functions/queries.server";
import { useKeyboardVisible } from "./hooks/useKeyboardVisible";
import { getPageSourceLanguage } from "./utils/getPageSourceLanguage";
import { handlePageTranslation } from "./utils/handlePageTranslation";
import { processHtmlContent } from "./utils/processHtmlContent";

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	if (!data) {
		return [{ title: "Edit Page" }];
	}
	return [{ title: `Edit ${data.title}` }];
};

export const editPageSchema = z.object({
	title: z.string().min(1, "Required"),
	pageContent: z.string().min(1, "Required Change something"),
	isPublished: z.enum(["true", "false"]),
	tags: z
		.array(
			z
				.string()
				.regex(
					/^[^\s!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]+$/,
					"symbol and space can not be used",
				)
				.min(1, "tag can be min 1")
				.max(15, "tag can be max 15 characters"),
		)
		.max(5, "tags can be max 5")
		.optional(),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
	const { userName, slug } = params;
	if (!userName || !slug) throw new Error("Invalid params");

	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});

	if (currentUser.userName !== userName) {
		throw new Response("Unauthorized", { status: 403 });
	}

	const page = await getPageBySlug(slug);
	const title = page?.sourceTexts.find(
		(sourceText) => sourceText.number === 0,
	)?.text;
	const allTags = await getAllTags();

	return { currentUser, page, allTags, title };
}

export async function action({ request, params }: ActionFunctionArgs) {
	const { userName, slug } = params;
	if (!userName || !slug) throw new Error("Invalid params");

	const currentUser = await authenticator.isAuthenticated(request, {
		failureRedirect: "/auth/login",
	});
	if (currentUser.userName !== userName) {
		throw new Response("Unauthorized", { status: 403 });
	}
	const formData = await request.formData();
	const submission = parseWithZod(formData, {
		schema: editPageSchema,
	});
	if (submission.status !== "success") {
		return { lastResult: submission.reply() };
	}

	const { title, pageContent, isPublished, tags } = submission.value;
	const isPublishedBool = isPublished === "true";
	const sourceLanguage = await getPageSourceLanguage(pageContent, title);
	const page = await processHtmlContent(
		title,
		pageContent,
		slug,
		currentUser.id,
		sourceLanguage,
		isPublishedBool,
	);
	if (tags) {
		await upsertTags(tags, page.id);
	}
	if (page.isPublished) {
		const geminiApiKey = process.env.GEMINI_API_KEY;
		if (!geminiApiKey) {
			throw new Error("Gemini API key is not set");
		}

		await handlePageTranslation({
			currentUserId: currentUser.id,
			pageId: page.id,
			sourceLanguage,
			geminiApiKey,
			title,
		});
	}
	return null;
}

export default function EditPage() {
	const { currentUser, page, allTags, title } = useLoaderData<typeof loader>();
	const fetcher = useFetcher<typeof action>();
	const isKeyboardVisible = useKeyboardVisible();

	const [editorInstance, setEditorInstance] = useState<TiptapEditor | null>(
		null,
	);
	const [currentTags, setCurrentTags] = useState<string[]>(
		page?.tagPages.map((tagPage) => tagPage.tag.name) || [],
	);
	const [currentIsPublished, setCurrentIsPublished] = useState(
		page?.isPublished,
	);

	const [form, fields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: editPageSchema });
		},
		id: "edit-page",
		lastResult: fetcher.data?.lastResult,
		constraint: getZodConstraint(editPageSchema),
		shouldValidate: "onInput",
		defaultValue: {
			title: title,
			pageContent: page?.content,
			isPublished: page?.isPublished.toString(),
			tags: page?.tagPages.map((tagPage) => tagPage.tag.name) || [],
		},
	});
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	const handleAutoSave = useCallback(() => {
		const formData = new FormData();
		formData.set("title", fields.title.value ?? "");
		formData.set("pageContent", fields.pageContent.value ?? "");
		formData.set("isPublished", currentIsPublished?.toString() || "false");
		currentTags.forEach((tag, index) => {
			formData.set(`${fields.tags.name}[${index}]`, tag);
		});
		if (fetcher.state !== "submitting") {
			fetcher.submit(formData, { method: "post" });
		}
	}, [fetcher, fields, currentTags, currentIsPublished]);

	const debouncedAutoSave = useDebouncedCallback(handleAutoSave, 1000);

	const handleContentChange = useCallback(() => {
		setHasUnsavedChanges(true);
		debouncedAutoSave();
	}, [debouncedAutoSave]);

	useEffect(() => {
		if (fetcher.state === "loading") {
			setHasUnsavedChanges(false);
		}
	}, [fetcher.state]);

	return (
		<div
			className={`overflow-y-scroll overflow-x-hidden flex flex-col ${isKeyboardVisible ? "overscroll-y-contain" : null}`}
			style={{
				height: "calc(100 * var(--svh, 1svh))",
			}}
			id="root"
		>
			<FormProvider context={form.context}>
				<fetcher.Form method="post" {...getFormProps(form)}>
					<EditHeader
						currentUser={currentUser}
						initialIsPublished={page?.isPublished}
						hasUnsavedChanges={hasUnsavedChanges}
						onPublishChange={(isPublished) => {
							setCurrentIsPublished(isPublished);
							handleContentChange();
						}}
						pageId={page?.id}
					/>
					<main
						className="w-full max-w-3xl prose dark:prose-invert sm:prose lg:prose-lg 
						mx-auto px-4  prose-headings:text-gray-700 prose-headings:dark:text-gray-200 text-gray-700 dark:text-gray-200 mb-5 mt-3 md:mt-5 flex-grow tracking-wider"
						style={{
							minHeight: isKeyboardVisible
								? "calc(100 * var(--svh, 1svh) - 47px)"
								: "calc(100 * var(--svh, 1svh) - 48px)",
						}}
					>
						<div className="">
							<h1 className="!m-0 ">
								<TextareaAutosize
									{...getTextareaProps(fields.title)}
									defaultValue={title}
									placeholder="Title"
									className="w-full outline-none bg-transparent resize-none overflow-hidden"
									minRows={1}
									maxRows={10}
									onChange={(e) => handleContentChange()}
									data-testid="title-input"
								/>
							</h1>
							{fields.title.errors?.map((error) => (
								<p className="text-sm text-red-500" key={error}>
									{error}
								</p>
							))}
							<TagInput
								tagsMeta={fields.tags}
								initialTags={
									page?.tagPages.map((tagPage) => ({
										id: tagPage.tagId,
										name: tagPage.tag.name,
									})) || []
								}
								allTags={allTags}
								onTagsChange={(tags) => {
									setCurrentTags(tags);
									handleContentChange();
								}}
							/>
						</div>
						<Editor
							initialContent={page?.content || ""}
							onContentChange={handleContentChange}
							onEditorCreate={setEditorInstance}
						/>
						{fields.pageContent.errors?.map((error) => (
							<p className="text-sm text-red-500" key={error}>
								{error}
							</p>
						))}
					</main>
					{editorInstance && <EditorKeyboardMenu editor={editorInstance} />}
				</fetcher.Form>
			</FormProvider>
		</div>
	);
}
