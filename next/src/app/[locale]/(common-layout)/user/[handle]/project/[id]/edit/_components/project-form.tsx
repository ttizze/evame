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
import type { ProjectTagWithCount } from "../_db/tag-queries.server";
import { type ProjectActionResponse, projectAction } from "./action";
import { ProjectLinkInput } from "./link-input";
import { ProjectTagInput } from "./tag-input";

// Define the ProjectLink interface to match the database schema
interface ProjectLink {
	id?: string;
	url: string;
	description: string;
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

	const handleTagsChange = useCallback((newTags: string[]) => {
		setTags(newTags);
	}, []);

	const handleLinksChange = useCallback((newLinks: ProjectLink[]) => {
		setLinks(newLinks);
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
		// タグ情報をフォームデータに追加
		formData.set("tags", JSON.stringify(tags));
		// リンク情報をフォームデータに追加
		formData.set("links", JSON.stringify(links));
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
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				{!isCreateMode && project?.id && (
					<input type="hidden" name="projectId" value={project.id} />
				)}

				<div className="space-y-4">
					<div>
						<Label htmlFor="title">Project Title</Label>
						<Input
							id="title"
							name="title"
							defaultValue={project?.title}
							placeholder="My Awesome Project"
							className="mt-1"
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
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							name="description"
							defaultValue={project?.description}
							placeholder="Describe your project..."
							className="min-h-32 mt-1"
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
