import { ClientDateFormatter } from "@/app/[locale]/_components/client-date-formatter";
import type { ProjectSummary } from "@/app/[locale]/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { getImageProps } from "next/image";
import { SegmentAndTranslationSection } from "../segment-and-translation-section/client";
import { ProjectActionsDropdown } from "./project-actions-dropdown/client";
import { ProjectLikeButton } from "./project-like-button/server";
import { ProjectTagList } from "./project-tag-list.server";
interface ProjectListProps {
	projectSummary: ProjectSummary;
	projectLink: string;
	userLink: string;
	showOwnerActions?: boolean;
	index?: number;
	currentUserHandle?: string;
}

export async function ProjectList({
	projectSummary,
	projectLink,
	userLink,
	showOwnerActions = false,
	index,
	currentUserHandle,
}: ProjectListProps) {
	const { props } = getImageProps({
		src: projectSummary.user.image,
		alt: "",
		width: 40,
		height: 40,
	});
	// Get the title segment (which should be the first segment)
	const tagLineSegment = projectSummary.segmentBundles.find(
		(segment) => segment.segment.number === 0,
	);

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
						{projectSummary.images && projectSummary.images.length > 0 ? (
							<Image
								src={projectSummary.images[0].url}
								alt={projectSummary.title || ""}
								fill
								className="object-cover"
								sizes="96px"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
								{projectSummary.title.charAt(0).toUpperCase()}
							</div>
						)}
					</Link>
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex justify-between items-start">
						<Link href={projectLink} className="block">
							<div className="font-medium break-all overflow-wrap-anywhere">
								{projectSummary.title}
							</div>
						</Link>

						{showOwnerActions && (
							<ProjectActionsDropdown projectSummary={projectSummary} />
						)}
					</div>

					{tagLineSegment && (
						<div className="text-sm break-all overflow-wrap-anywhere">
							<SegmentAndTranslationSection
								segmentBundle={tagLineSegment}
								currentHandle={currentUserHandle}
								segmentTextClassName="line-clamp-1"
							/>
						</div>
					)}

					<ProjectTagList
						projectTag={projectSummary.projectTagRelations.map(
							(relation) => relation.projectTag,
						)}
					/>

					<div className="flex justify-between items-center mt-2">
						<div className="flex items-center">
							<Link href={userLink} className="flex items-center">
								<Avatar className="w-5 h-5 mr-1">
									<AvatarImage {...props} />
									<AvatarFallback>
										{projectSummary.user.handle.charAt(0).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<span className="text-xs text-gray-600">
									{projectSummary.user.name}
								</span>
							</Link>
							<p className="text-xs text-muted-foreground ml-2">
								<ClientDateFormatter
									date={new Date(projectSummary.createdAt)}
								/>
							</p>
						</div>

						<div className="flex items-center">
							<ProjectLikeButton projectId={projectSummary.id} showCount />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
