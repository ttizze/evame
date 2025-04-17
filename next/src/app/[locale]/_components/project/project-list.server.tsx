import { ClientDateFormatter } from "@/app/[locale]/_components/client-date-formatter";
import type { ProjectWithRelationsForList } from "@/app/[locale]/_db/queries.server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { getImageProps } from "next/image";
import { ProjectActionsDropdown } from "./project-actions-dropdown/client";
import { ProjectLikeButton } from "./project-like-button/server";
import { ProjectTagList } from "./project-tag-list.server";

interface ProjectListProps {
	projectWithRelations: ProjectWithRelationsForList;
	projectLink: string;
	userLink: string;
	showOwnerActions?: boolean;
	index?: number;
}

export async function ProjectList({
	projectWithRelations,
	projectLink,
	userLink,
	showOwnerActions = false,
	index,
}: ProjectListProps) {
	const { props } = getImageProps({
		src: projectWithRelations.user.image,
		alt: "",
		width: 40,
		height: 40,
	});

	return (
		<div className="flex py-4 justify-between border-b last:border-b-0">
			{index !== undefined && (
				<div className="flex items-start justify-center w-6 text-lg font-medium text-muted-foreground mr-2">
					{index + 1}
				</div>
			)}

			<div className="flex gap-4 w-full">
				<div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded">
					<Link href={projectLink} className="block h-full w-full">
						{projectWithRelations.images &&
						projectWithRelations.images.length > 0 ? (
							<Image
								src={projectWithRelations.images[0].url}
								alt={projectWithRelations.title || ""}
								fill
								className="object-cover"
								sizes="96px"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
								{projectWithRelations.title.charAt(0).toUpperCase()}
							</div>
						)}
					</Link>
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex justify-between items-start">
						<Link href={projectLink} className="block">
							<div className="font-medium break-all overflow-wrap-anywhere">
								{projectWithRelations.title}
							</div>
						</Link>

						{showOwnerActions && (
							<ProjectActionsDropdown project={projectWithRelations} />
						)}
					</div>

					{/* <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
						{projectWithRelations.description}
					</p> */}

					<ProjectTagList
						projectTag={projectWithRelations.projectTagRelations.map(
							(relation) => relation.projectTag,
						)}
					/>

					<div className="flex justify-between items-center mt-2">
						<div className="flex items-center">
							<Link href={userLink} className="flex items-center">
								<Avatar className="w-5 h-5 mr-1">
									<AvatarImage {...props} />
									<AvatarFallback>
										{projectWithRelations.user.handle.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<span className="text-xs text-gray-600">
									{projectWithRelations.user.name}
								</span>
							</Link>
							<p className="text-xs text-muted-foreground ml-2">
								<ClientDateFormatter
									date={new Date(projectWithRelations.createdAt)}
								/>
							</p>
						</div>

						<div className="flex items-center">
							<ProjectLikeButton
								projectId={projectWithRelations.id}
								showCount
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
