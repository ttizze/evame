import { getCurrentUser } from "@/auth";
import { ProjectLikeButtonClient } from "./client";
import { getProjectLikeAndCount } from "./db/queries.server";

interface ProjectLikeButtonProps {
	projectId: number;
	showCount?: boolean;
	className?: string;
}

export async function ProjectLikeButton({
	projectId,
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
			showCount={showCount}
			className={className}
		/>
	);
}
