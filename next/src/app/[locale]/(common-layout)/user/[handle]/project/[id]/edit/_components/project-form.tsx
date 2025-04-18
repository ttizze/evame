"use client";

import { Editor } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[slug]/edit/_components/editor/editor";
import type { ProjectDetail } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ProjectTagWithCount } from "../_db/queries.server";
import { type ProjectActionResponse, projectAction } from "./action";
import { ProjectImageInput } from "./image-input";
import { ProjectLinkInput } from "./link-input";
import { ProjectTagInput } from "./tag-input";
// Define the ProjectLink interface to match the database schema
interface ProjectLink {
	id?: string;
	url: string;
	description: string;
}

// Define the ProjectImage interface to match the database schema
interface ProjectImage {
	id?: string;
	url: string;
	caption: string;
	order: number;
	file?: File; // For new uploads
}

interface ProjectFormProps {
	projectDetail?: ProjectDetail | null;
	userHandle: string;
	allProjectTags: ProjectTagWithCount[];
}

export function ProjectForm({
	projectDetail,
	userHandle,
	allProjectTags,
}: ProjectFormProps) {
	const router = useRouter();
	const isCreateMode = !projectDetail;

	const initialTags =
		projectDetail?.projectTagRelations.map((relation) => relation.projectTag) ||
		[];

	const initialLinks = (projectDetail?.links as ProjectLink[]) || [];
	const initialImages = (projectDetail?.images as ProjectImage[]) || [];

	// フォーム状態
	const [tags, setTags] = useState<string[]>(
		initialTags.map((tag) => tag.name),
	);
	const [description, setDescription] = useState(
		projectDetail?.description || "",
	);
	const [links, setLinks] = useState<ProjectLink[]>(initialLinks);
	const [images, setImages] = useState<ProjectImage[]>(initialImages);

	const [state, action, isPending] = useActionState<
		ProjectActionResponse,
		FormData
	>(projectAction, { success: false });

	useEffect(() => {
		if (state.success) {
			toast.success(
				state.message ||
					`Project ${isCreateMode ? "created" : "updated"} successfully`,
			);
			// 新規作成時は一覧ページ、編集時は詳細ページへリダイレクト
			const redirectPath = isCreateMode
				? `/user/${userHandle}/project-management`
				: `/user/${userHandle}/project/${projectDetail?.id}`;
			router.push(redirectPath);
			router.refresh();
		} else if (state.message) {
			toast.error(state.message);
		}
	}, [state, router, userHandle, projectDetail?.id, isCreateMode]);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);

		// Add project ID if editing
		if (projectDetail?.id) {
			formData.set("projectId", projectDetail.id);
		}

		// Add tag information to form data
		formData.set("tags", JSON.stringify(tags));

		// Add link information to form data
		formData.set("links", JSON.stringify(links));

		// Add image files to form data
		for (const image of images) {
			// Only add file for new images (with temp URL prefix)
			if (image.file && image.url.startsWith("temp://upload/")) {
				// Use the filename from the temp URL as the key to match in the server action
				const fileName = image.url.split("/").pop() || "";
				formData.append("imageFiles", image.file);
				formData.append("imageFileNames", fileName);
			}
		}

		// Add image metadata to form data
		formData.set(
			"images",
			JSON.stringify(images.map(({ file, ...imageData }) => imageData)),
		);

		startTransition(() => {
			action(formData);
		});
	};

	return (
		<div className="space-y-6 ">
			<div>
				<h1 className="text-2xl font-bold">
					{isCreateMode ? "New Project" : "Edit Project"}
				</h1>
				<p className="text-muted-foreground">
					{isCreateMode
						? "Create a new project"
						: "Update your project details"}
				</p>
				<div className="text-sm text-muted-foreground mb-4">
					<span className="text-red-500">*</span> Required fields
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				<div className="space-y-4">
					<div>
						<Label htmlFor="title" className="flex items-center">
							Project Title <span className="text-red-500 ml-1">*</span>
						</Label>
						<Input
							id="title"
							name="title"
							defaultValue={projectDetail?.title}
							placeholder="My Awesome Project"
							className="mt-1"
							required
						/>
						{state.zodErrors?.title && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.title}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							The name of your project.
						</p>
					</div>

					<div>
						<Label htmlFor="description" className="flex items-center">
							Description <span className="text-red-500 ml-1">*</span>
						</Label>
						<div className="mt-1 prose dark:prose-invert">
							<Editor
								defaultValue={projectDetail?.description || ""}
								name="description"
								className="border border-input rounded-md  py-2 min-h-32"
								placeholder="Describe your project..."
							/>
						</div>
						{state.zodErrors?.description && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.description}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							A brief description of your project.
						</p>
					</div>

					<div>
						<Label htmlFor="tags">Tags</Label>
						<ProjectTagInput
							initialTags={initialTags}
							allTagsWithCount={allProjectTags}
							onChange={setTags}
						/>
						{state.zodErrors?.tags && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.tags}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							Add up to 5 tags to categorize your project.
						</p>
					</div>

					<div>
						<Label htmlFor="links">Project Links</Label>
						<ProjectLinkInput initialLinks={links} onChange={setLinks} />
						{state.zodErrors?.links && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.links}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							Add links to your project repository, demo, or documentation.
						</p>
					</div>

					<div>
						<Label htmlFor="images">Project Images</Label>
						<ProjectImageInput initialImages={images} onChange={setImages} />
						{state.zodErrors?.images && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.images}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							Add images showcasing your project. The first image will be used
							as the thumbnail.
						</p>
					</div>
				</div>
				<div className="flex gap-4 justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={() => {
							const returnPath = isCreateMode
								? `/user/${userHandle}/project-management`
								: `/user/${userHandle}/project/${projectDetail?.id}`;
							router.push(returnPath);
						}}
					>
						Cancel
					</Button>
					<Button type="submit" disabled={isPending}>
						{isPending
							? isCreateMode
								? "Creating..."
								: "Updating..."
							: isCreateMode
								? "Create Project"
								: "Update Project"}
					</Button>
				</div>
			</form>
		</div>
	);
}
