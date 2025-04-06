"use client";

import { PaginationBar } from "@/app/[locale]/_components/pagination-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/routing";
import { Edit, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import type { ProjectWithRelations } from "../../../project/[id]/_db/queries.server";
import { DeleteProjectDialog } from "../delete-project-dialog/client";

interface ProjectManagementTabClientProps {
	projects: ProjectWithRelations[];
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
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<Input
					placeholder="Search projects..."
					value={query || ""}
					onChange={(e) => setQuery(e.target.value)}
					className="max-w-md"
				/>
				<Link href={`/user/${handle}/project/new`}>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						Create
					</Button>
				</Link>
			</div>

			{projects.length === 0 ? (
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
				<div className="space-y-4">
					{projects.map(
						(project) =>
							project && (
								<div
									key={project.id}
									className="flex border-b py-4 justify-between"
								>
									<div className="flex gap-4">
										<div className="relative h-16 w-24 overflow-hidden rounded">
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
										<div>
											<Link
												href={`/user/${handle}/project/${project.id}`}
												className="font-medium"
											>
												{project.title}
											</Link>
											<p className="text-sm text-muted-foreground line-clamp-1 mt-1">
												{project.description}
											</p>
											<div className="flex flex-wrap gap-1 mt-2">
												{project.projectTagRelations?.slice(0, 3).map(
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
												{project.projectTagRelations &&
													project.projectTagRelations.length > 3 && (
														<Badge variant="outline" className="text-xs">
															+{project.projectTagRelations.length - 3}
														</Badge>
													)}
											</div>
										</div>
									</div>
									<div className="flex gap-2">
										<Link href={`/user/${handle}/project/${project.id}/edit`}>
											<Button variant="ghost" size="icon">
												<Edit className="h-4 w-4" />
											</Button>
										</Link>
										<Button
											variant="ghost"
											size="icon"
											className="text-destructive"
											onClick={() => {
												setProjectToDelete(project.id);
												setDeleteDialogOpen(true);
											}}
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							),
					)}
				</div>
			)}

			<div className="flex justify-center mt-4">
				<PaginationBar totalPages={totalPages} currentPage={currentPage} />
			</div>

			<DeleteProjectDialog
				projectId={projectToDelete}
				isOpen={deleteDialogOpen}
				onOpenChange={setDeleteDialogOpen}
			/>
		</div>
	);
}
