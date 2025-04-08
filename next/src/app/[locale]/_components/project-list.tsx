import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import type { ProjectWithRelations } from "../(common-layout)/user/[handle]/project/[id]/_db/queries.server";

interface ProjectListProps {
	projects: ProjectWithRelations[];
	renderActions?: (project: ProjectWithRelations) => React.ReactNode;
}

export function ProjectList({ projects, renderActions }: ProjectListProps) {
	return (
		<div className="space-y-4">
			{projects.map((project, index) =>
				project ? (
					<div
						key={project.id}
						className={`flex py-4 justify-between ${
							index !== projects.length - 1 ? "border-b" : ""
						}`}
					>
						<div className="flex gap-4">
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
								<Link
									href={`/user/${project.user.handle}/project/${project.id}`}
									className="font-medium"
								>
									{project.title}
								</Link>
								<p className="text-sm text-muted-foreground line-clamp-1 mt-1 overflow-hidden text-ellipsis max-w-full">
									{project.description}
								</p>
								<div className="flex flex-wrap gap-1 mt-2">
									{project.projectTagRelations.map(
										(relation) =>
											relation?.projectTag && (
												<Badge
													key={relation.projectTag.id}
													variant="secondary"
													className="text-xs"
												>
													{relation.projectTag.name}
												</Badge>
											),
									)}
								</div>
							</div>
						</div>
						{renderActions?.(project)}
					</div>
				) : null,
			)}
		</div>
	);
}
