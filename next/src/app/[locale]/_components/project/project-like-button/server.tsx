import { getCurrentUser } from "@/auth";
import { ProjectLikeButtonClient } from "./client";
import { getProjectLikeAndCount } from "./db/queries.server";

interface ProjectLikeButtonProps {
	projectId: number;
	projectSlug: string;
	showCount?: boolean;
	className?: string;
}

export async function ProjectLikeButton({
	projectId,
	projectSlug,
	showCount = true,
	className,
}: ProjectLikeButtonProps) {
	const currentUser = await getCurrentUser();

	const { liked, likeCount } = await getProjectLikeAndCount(
		projectId,
		currentUser?.id ?? "",
	);
	return (
		<ProjectLikeButtonClient
			liked={liked}
			likeCount={likeCount}
			projectId={projectId}
			projectSlug={projectSlug}
			showCount={showCount}
			className={className}
		/>
	);
}
