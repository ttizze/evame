"use client";

import type { ProjectWithTitle } from "@/app/[locale]/(common-layout)/user/[handle]/project-management/_db/queries.server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { ProjectActionsDropdown } from "@/app/[locale]/_components/project/project-actions-dropdown/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import type { LifecycleStatus } from "@prisma/client";
import { Plus } from "lucide-react";
import Form from "next/form";
import { parseAsString, useQueryState } from "nuqs";
import { createProjectDraft } from "./action";
interface ProjectManagementTabClientProps {
	projects: ProjectWithTitle[];
	totalPages: number;
	currentPage: number;
	handle: string;
}

export function ProjectManagementTabClient({
	projects,
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
	const getStatusBadge = (status: LifecycleStatus) => {
		if (status === "PUBLIC") {
			return (
				<Badge variant="default" className="w-16 text-center">
					Public
				</Badge>
			);
		}
		return (
			<Badge variant="outline" className="w-16 text-center">
				Private
			</Badge>
		);
	};

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
				{projects.map((project) => (
					<div key={project.id} className="flex border-b py-2 justify-between">
						<div>
							<Link href={`/user/${handle}/project/${project.slug}`}>
								{project.title}
							</Link>
							<div className="flex gap-2 mt-2">
								{getStatusBadge(project.status)}
								{project.updatedAt.toLocaleDateString()}
							</div>
						</div>
						<ProjectActionsDropdown
							projectSlug={project.slug}
							projectId={project.id}
							projectOwnerHandle={handle}
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
