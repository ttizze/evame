import { Link } from "@/i18n/routing";
import { Hash } from "lucide-react";
import Image from "next/image";
import type { ProjectWithRelations } from "../(common-layout)/user/[handle]/project/[id]/_db/queries.server";
import { ProjectActionsDropdown } from "./project-actions-dropdown/client";
import { ProjectLikeButton } from "./project-like-button/server";

interface ProjectListProps {
	projects: ProjectWithRelations[];
	isOwner?: boolean;
}

export async function ProjectList({
	projects,
	isOwner = false,
}: ProjectListProps) {
	return (
		<div className="space-y-4">
			{projects.map((project, index) =>
				project ? (
					<div
						key={project.id}
						className={`flex py-4 ${
							index !== projects.length - 1 ? "border-b" : ""
						}`}
					>
						<div className="flex gap-4 flex-1">
							<div className="flex items-start justify-center w-6 text-lg font-medium text-muted-foreground">
								{index + 1}
							</div>
							<div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded">
								{project.images && project.images.length > 0 ? (
									<Image
										src={project.images[0].url}
										alt={project.title || ""}
										fill
										className="object-contain"
										sizes="96px"
									/>
								) : (
									<div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
										{project.title.charAt(0).toUpperCase()}
									</div>
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between">
									<Link
										href={`/user/${project.user.handle}/project/${project.id}`}
										className="font-medium"
									>
										{project.title}
									</Link>
									{isOwner && <ProjectActionsDropdown project={project} />}
								</div>
								<div className="flex justify-between items-start mt-1">
									<div className="flex-1">
										<p className="text-sm text-muted-foreground line-clamp-1 overflow-hidden text-ellipsis max-w-full">
											{project.description}
										</p>
										<div className="flex flex-wrap gap-1 mt-2">
											{project.projectTagRelations.map(
												(relation) =>
													relation?.projectTag && (
														<Link
															href={`/search?query=${encodeURIComponent(relation.projectTag.name)}&category=tags&tagPage=true`}
															key={relation.projectTag.id}
															className="flex items-center gap-1 px-3 h-[32px] !no-underline bg-secondary rounded-full text-sm text-secondary-foreground"
														>
															<Hash className="w-3 h-3" />
															{relation.projectTag.name}
														</Link>
													),
											)}
										</div>
									</div>
									<div className="ml-4 flex-shrink-0">
										<ProjectLikeButton projectId={project.id} />
									</div>
								</div>
							</div>
						</div>
					</div>
				) : null,
			)}
		</div>
	);
}
