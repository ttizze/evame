"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import {
	startTransition,
	useActionState,
	useCallback,
	useEffect,
	useState,
} from "react";
import { toast } from "sonner";
import type { ProjectWithRelations } from "../../_db/queries.server";
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
	project?: ProjectWithRelations | null;
	userHandle: string;
	allProjectTags: ProjectTagWithCount[];
}

export function ProjectForm({
	project,
	userHandle,
	allProjectTags,
}: ProjectFormProps) {
	const router = useRouter();
	const isCreateMode = !project;

	const selectedTags =
		project?.projectTagRelations.map((relation) => relation.projectTag) || [];

	const [tags, setTags] = useState<string[]>(
		selectedTags.map((tag) => tag.name),
	);

	// Initialize links from project or empty array
	const projectLinks = project?.links as ProjectLink[] | undefined;
	const [links, setLinks] = useState<ProjectLink[]>(projectLinks || []);

	// Initialize images from project or empty array
	const projectImages = project?.images as ProjectImage[] | undefined;
	const [images, setImages] = useState<ProjectImage[]>(projectImages || []);

	const handleTagsChange = useCallback((newTags: string[]) => {
		setTags(newTags);
	}, []);

	const handleLinksChange = useCallback((newLinks: ProjectLink[]) => {
		setLinks(newLinks);
	}, []);

	const handleImagesChange = useCallback((newImages: ProjectImage[]) => {
		setImages(newImages);
	}, []);

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
				: `/user/${userHandle}/project/${project?.id}`;
			router.push(redirectPath);
			router.refresh();
		} else if (state.message) {
			toast.error(state.message);
		}
	}, [state, router, userHandle, project?.id, isCreateMode]);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);

		// Add project ID if editing
		if (project?.id) {
			formData.set("projectId", project.id);
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
		<div className="space-y-6">
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
							defaultValue={project?.title}
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
						<Textarea
							id="description"
							name="description"
							defaultValue={project?.description}
							placeholder="Describe your project..."
							className="min-h-32 mt-1"
							required
						/>
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
							initialTags={selectedTags}
							allTagsWithCount={allProjectTags}
							onChange={handleTagsChange}
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
						<ProjectLinkInput
							initialLinks={links}
							onChange={handleLinksChange}
						/>
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
						<ProjectImageInput
							initialImages={images}
							onChange={handleImagesChange}
						/>
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
								: `/user/${userHandle}/project/${project?.id}`;
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
