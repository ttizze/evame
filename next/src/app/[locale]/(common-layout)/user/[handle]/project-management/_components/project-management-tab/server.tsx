import { fetchUserProjectsWithPagination } from "@/app/[locale]/(common-layout)/user/[handle]/_db/queries.server";
import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { ProjectList } from "@/app/[locale]/_components/project-list";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { SearchInput } from "../search-input.client";

interface ProjectManagementTabProps {
	currentUserId: string;
	page: number;
	query: string;
	handle: string;
}

export async function ProjectManagementTab({
	currentUserId,
	page,
	query,
	handle,
}: ProjectManagementTabProps) {
	const { projectsWithRelations, totalPages, currentPage } =
		await fetchUserProjectsWithPagination(currentUserId, page, 10, query);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<SearchInput initialQuery={query} />
				<Link href={`/user/${handle}/project/new`}>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						Create
					</Button>
				</Link>
			</div>

			{projectsWithRelations.length === 0 ? (
				<div className="text-center py-12 border rounded-lg bg-muted/20">
					<p className="text-muted-foreground mb-4">No projects found</p>
					<Link href={`/user/${handle}/project/new`}>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							Create project
						</Button>
					</Link>
				</div>
			) : (
				<ProjectList projects={projectsWithRelations} isOwner={true} />
			)}

			<div className="flex justify-center mt-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>
		</div>
	);
}
