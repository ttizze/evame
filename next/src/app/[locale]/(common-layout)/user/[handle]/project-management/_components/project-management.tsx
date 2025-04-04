"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

import { Edit, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectWithRelations } from "../../project/[id]/_db/queries.server";

interface ProjectManagementProps {
	projects: ProjectWithRelations[];
	locale: string;
	userId: string;
	userHandle: string;
}

export default function ProjectManagement({
	projects,
	locale,
	userId,
	userHandle,
}: ProjectManagementProps) {
	const router = useRouter();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDeleteProject = async () => {
		if (!projectToDelete) return;

		setIsDeleting(true);

		try {
			const response = await fetch(`/api/projects/${projectToDelete}`, {
				method: "DELETE",
			});

			if (response.ok) {
				setDeleteDialogOpen(false);
				router.refresh();
			} else {
				console.error("Failed to delete project");
			}
		} catch (error) {
			console.error("Error deleting project:", error);
		} finally {
			setIsDeleting(false);
		}
	};
	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<Link href={`/${locale}/user/${userHandle}/project/new`}>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						create
					</Button>
				</Link>
			</div>

			{projects.length === 0 ? (
				<div className="text-center py-12 border rounded-lg bg-muted/20">
					<p className="text-muted-foreground mb-4">no projects</p>
					<Link href={`/${locale}/user/${userHandle}/project/new`}>
						<Button>
							<Plus className="h-4 w-4 mr-2" />
							create first project
						</Button>
					</Link>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{projects.map(
						(project) =>
							project && (
								<Card
									key={project.id}
									className="overflow-hidden flex flex-col"
								>
									{project.images && project.images.length > 0 && (
										<div className="relative aspect-video w-full overflow-hidden">
											<Image
												src={project.images[0].url}
												alt={project.title || ""}
												fill
												className="object-cover"
												sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
											/>
										</div>
									)}

									<CardHeader className="pb-2">
										<CardTitle className="line-clamp-1">
											<Link
												href={`/${locale}/user/${userHandle}/project/${project.id}`}
											>
												{project.title}
											</Link>
										</CardTitle>
										<div className="flex flex-wrap gap-1 mt-1">
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
											{project.projectTagRelations?.length > 3 && (
												<Badge variant="outline" className="text-xs">
													+{project.projectTagRelations.length - 3}
												</Badge>
											)}
										</div>
									</CardHeader>

									<CardContent className="pb-2 flex-grow">
										<p className="text-sm text-muted-foreground line-clamp-2">
											{project.description}
										</p>
									</CardContent>

									<CardFooter className="flex justify-between pt-2 border-t">
										<div className="flex gap-2">
											<Link
												href={`/${locale}/user/${userHandle}/project/${project.id}/edit`}
											>
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
									</CardFooter>
								</Card>
							),
					)}
				</div>
			)}

			{/* 削除確認ダイアログ */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>delete project</DialogTitle>
						<DialogDescription>delete project confirmation</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDeleteDialogOpen(false)}
							disabled={isDeleting}
						>
							cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDeleteProject}
							disabled={isDeleting}
						>
							{isDeleting ? "deleting" : "delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
