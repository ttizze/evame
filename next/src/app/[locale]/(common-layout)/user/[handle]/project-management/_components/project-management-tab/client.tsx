"use client";

import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { ProjectActionsDropdown } from "@/app/[locale]/_components/project/project-actions-dropdown/client";
import type { ProjectSummary } from "@/app/[locale]/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { Plus } from "lucide-react";
import Form from "next/form";
import { parseAsString, useQueryState } from "nuqs";
import { createProjectDraft } from "./action";
interface ProjectManagementTabClientProps {
	projectSummaries: ProjectSummary[];
	totalPages: number;
	currentPage: number;
	handle: string;
}

export function ProjectManagementTabClient({
	projectSummaries,
	totalPages,
	currentPage,
	handle,
}: ProjectManagementTabClientProps) {
	const [query, setQuery] = useQueryState(
		"query",
		parseAsString.withOptions({
			shallow: false,
		}),
	);

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center">
				<Input
					placeholder="Search pages..."
					value={query || ""}
					onChange={(e) => setQuery(e.target.value)}
					className="w-full"
				/>
				<Form action={createProjectDraft}>
					<Button type="submit">
						<Plus className="h-4 w-4 mr-2" />
						Create
					</Button>
				</Form>
			</div>

			<div className="rounded-md">
				{projectSummaries.map((projectSummary) => (
					<div
						key={projectSummary.id}
						className="flex border-b py-2 justify-between"
					>
						<div>
							<Link href={`/user/${handle}/project/${projectSummary.id}`}>
								{projectSummary.title}
							</Link>
						</div>
						<ProjectActionsDropdown
							projectId={projectSummary.id}
							projectOwnerHandle={projectSummary.user.handle}
						/>
					</div>
				))}
			</div>

			<div className="flex justify-center mt-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>
		</div>
	);
}
