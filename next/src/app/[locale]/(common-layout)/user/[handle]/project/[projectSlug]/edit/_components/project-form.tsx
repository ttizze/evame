"use client";

import { Editor } from "@/app/[locale]/(edit-layout)/user/[handle]/page/[pageSlug]/edit/_components/editor/editor";
import { useTranslationJobToast } from "@/app/[locale]/_hooks/use-translation-job-toast";
import { useTranslationJobs } from "@/app/[locale]/_hooks/use-translation-jobs";
import type { ProjectDetail } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useActionState } from "react";
import type { ProjectTagWithCount } from "../_db/queries.server";
import { type ProjectActionResponse, projectAction } from "./action";
import { ProjectIconInput } from "./icon-input.server";
import { ProjectImageInput } from "./image-input/client";
import { ProjectLinkInput } from "./link-input/client";
import { ProjectTagInput } from "./tag-input/client";
import { useProjectFormState } from "./use-form-fields";
interface Props {
	projectDetail: ProjectDetail;
	allProjectTags: ProjectTagWithCount[];
	userLocale: string;
	html: string;
}
const PROGRESS_VALUES = [
	"IDEA",
	"WIP",
	"REVIEW",
	"RELEASED",
	"FROZEN",
] as const;

export function ProjectForm({
	projectDetail,
	allProjectTags,
	userLocale,
	html,
}: Props) {
	const {
		tagLine,
		tags,
		setTags,
		links,
		setLinks,
		images,
		setImages,
		icon,
		setIcon,
	} = useProjectFormState(projectDetail);
	/* ───────── Action / Toast ───────── */
	const [state, action, isPending] = useActionState<
		ProjectActionResponse,
		FormData
	>(projectAction, { success: false });
	const { jobs } = useTranslationJobs(
		state.success ? state.data.translationJobs : [],
	);
	useTranslationJobToast(jobs);

	/* ───────── JSX ───────── */
	return (
		<div className="space-y-6 ">
			<div>
				<h1 className="text-2xl font-bold">"Edit Project"</h1>
				<p className="text-muted-foreground">"Update your project details"</p>
				<div className="text-sm text-muted-foreground mb-4">
					<span className="text-red-500">*</span> Required fields
				</div>
			</div>

			<form action={action} className="space-y-8">
				<input type="hidden" name="userLocale" value={userLocale} />
				<input type="hidden" name="projectId" value={projectDetail.id} />
				<input type="hidden" name="slug" value={projectDetail.slug} />
				<input type="hidden" name="tags" value={JSON.stringify(tags)} />
				<input type="hidden" name="links" value={JSON.stringify(links)} />
				<input type="hidden" name="images" value={JSON.stringify(images)} />
				<input type="hidden" name="icon" value={JSON.stringify(icon)} />
				<div className="space-y-4">
					<div>
						<Label htmlFor="icon">Project Icon</Label>
						<ProjectIconInput initialIcon={icon} onChange={setIcon} />
						{!state.success && state.zodErrors?.icon && (
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
						{!state.success && state.zodErrors?.title && (
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
						{!state.success && state.zodErrors?.tagLine && (
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
								defaultValue={html}
								name="description"
								className="border border-input rounded-md px-2 py-2 min-h-32"
								placeholder="Describe your project..."
							/>
						</div>
						{!state.success && state.zodErrors?.description && (
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
							initialTags={projectDetail.projectTagRelations.map(
								(r) => r.projectTag,
							)}
							allTagsWithCount={allProjectTags}
							onChange={setTags}
						/>
						{!state.success && state.zodErrors?.tags && (
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
						{!state.success && state.zodErrors?.links && (
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
						{!state.success && state.zodErrors?.images && (
							<p className="text-sm text-red-500 mt-1">
								{state.zodErrors.images}
							</p>
						)}
						<p className="text-sm text-muted-foreground mt-1">
							Add screenshots or visuals of your project.
						</p>
					</div>

					<div>
						<Label>Progress *</Label>
						<Select defaultValue={projectDetail.progress} name="progress">
							<SelectTrigger className="mt-1">
								<SelectValue placeholder="Progress" />
							</SelectTrigger>
							<SelectContent>
								{PROGRESS_VALUES.map((v) => (
									<SelectItem key={v} value={v} className="uppercase">
										{v}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<div className="grid gap-4 justify-items-end">
					<div>
						<Button
							type="submit"
							name="status"
							value="PUBLIC"
							disabled={isPending}
						>
							{isPending ? "Processing" : "Publish"}
						</Button>
					</div>
				</div>
			</form>
		</div>
	);
}
