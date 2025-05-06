import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { fetchPaginatedPublicProjectSummaries } from "@/app/[locale]/_db/project-queries.server";
import { getCurrentUser } from "@/auth";
import { FolderOpenIcon } from "lucide-react";
import { createLoader, parseAsInteger } from "nuqs/server";
import type { SearchParams } from "nuqs/server";
import { ProjectListContainer } from "../project-list-container/server";
import { ProjectList } from "../project-list.server";
const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
};

const loadSearchParams = createLoader(searchParamsSchema);

interface PopularProjectListProps {
	locale: string;
	searchParams: Promise<SearchParams>;
	showPagination?: boolean;
}

export default async function PopularProjectList({
	locale,
	searchParams,
	showPagination = false,
}: PopularProjectListProps) {
	const { page } = await loadSearchParams(searchParams);
	const currentUser = await getCurrentUser();

	const { projectSummaries, totalPages } =
		await fetchPaginatedPublicProjectSummaries({
			page,
			pageSize: 10,
			locale,
			currentUserId: currentUser?.id,
		});

	return (
		<ProjectListContainer title="Popular Projects" icon={FolderOpenIcon}>
			{projectSummaries.map((projectSummary, index) => (
				<ProjectList
					key={projectSummary.id}
					projectSummary={projectSummary}
					projectLink={`/user/${projectSummary.user.handle}/project/${projectSummary.slug}`}
					userLink={`/user/${projectSummary.user.handle}`}
					index={index}
				/>
			))}
			{showPagination && totalPages > 1 && (
				<div className="mt-8 flex justify-center">
					<PaginationBar totalPages={totalPages} currentPage={page} />
				</div>
			)}
		</ProjectListContainer>
	);
}
