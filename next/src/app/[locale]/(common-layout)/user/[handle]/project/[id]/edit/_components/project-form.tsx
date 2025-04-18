"use client";

import { Editor } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[slug]/edit/_components/editor/editor";
import type { ProjectDetail } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import {
	startTransition,
	useActionState,
	useEffect,
	useMemo,
	useState,
} from "react";
import { toast } from "sonner";
import type { ProjectTagWithCount } from "../_db/queries.server";
import { type ProjectActionResponse, projectAction } from "./action";
import { ProjectIconInput } from "./icon-input.server";
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
interface ProjectIcon {
	// 1 枚だけ扱う
	id?: string;
	url: string;
	file?: File; // 新規アップロード用
}
interface ProjectFormProps {
	projectDetail?: ProjectDetail | null;
	userHandle: string;
	allProjectTags: ProjectTagWithCount[];
}
const fileNameFromUrl = (url: string): string => url.split("/").pop() ?? "";

const stripFileField = <T extends { file?: File }>(
	item: T,
): Omit<T, "file"> => {
	const { file: _file, ...rest } = item;
	return rest;
};

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
	const initialImages =
		(projectDetail?.images.filter(
			(img) => img.id !== projectDetail?.iconImage?.id,
		) as ProjectImage[]) || [];

	const tagLine = useMemo(() => {
		const bundle = projectDetail?.segmentBundles.find(
			(b) => b.segment.number === 0,
		);
		return bundle?.segment.text ?? "";
	}, [projectDetail]);

	// フォーム状態
	const [tags, setTags] = useState<string[]>(
		initialTags.map((tag) => tag.name),
	);
	const [links, setLinks] = useState<ProjectLink[]>(initialLinks);
	const [images, setImages] = useState<ProjectImage[]>(initialImages);
	const [icon, setIcon] = useState<ProjectImage | null>(
		projectDetail?.iconImage ?? null,
	);
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
	const buildFormData = (event: React.FormEvent<HTMLFormElement>): FormData => {
		const formData = new FormData(event.currentTarget);

		if (projectDetail?.id) formData.set("projectId", projectDetail.id);

		formData.set("tags", JSON.stringify(tags));
		formData.set("links", JSON.stringify(links));
		// ---------------- Icon handling ----------------
		if (!icon) {
			formData.set("icon", ""); // removed
		} else {
			const { id, url, file } = icon;
			// Send id when retaining; undefined id when new upload – server can infer
			formData.set("icon", JSON.stringify({ id, url }));
			if (file) {
				formData.append("iconFile", file);
				formData.append("iconFileName", file.name);
			}
		}

		// --------------- Images handling ---------------
		for (const img of images) {
			if (img.file && img.url.startsWith("temp://upload/")) {
				formData.append("imageFiles", img.file);
				formData.append("imageFileNames", fileNameFromUrl(img.url));
			}
		}

		formData.set("images", JSON.stringify(images.map(stripFileField)));

		return formData;
	};

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = buildFormData(e);
		startTransition(() => action(formData));
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
						<Label htmlFor="icon">Project Icon</Label>
						<ProjectIconInput initialIcon={icon} onChange={setIcon} />
						{state.zodErrors?.icon && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.icon}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							This image will be shown on cards / OGP. 1 : 1 aspect ratio is
							recommended.
						</p>
					</div>
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
						<Label htmlFor="tagLine" className="flex items-center">
							Tag Line <span className="text-red-500 ml-1">*</span>
						</Label>
						<Input
							id="tagLine"
							name="tagLine"
							defaultValue={tagLine}
							placeholder="A short description of your project"
							className="mt-1"
							required
						/>
						{state.zodErrors?.tagLine && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.tagLine}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							A brief one-line summary of your project.
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
								className="border border-input rounded-md px-2 py-2 min-h-32"
								placeholder="Describe your project..."
							/>
						</div>
						{state.zodErrors?.description && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.description}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							A detailed description of your project.
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
							Add screenshots or visuals of your project.
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
