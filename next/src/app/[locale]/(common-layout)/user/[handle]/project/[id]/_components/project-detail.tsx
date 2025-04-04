"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import type { ProjectImage, ProjectLink } from "@prisma/client";
import { ExternalLink, Github, Globe } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ProjectWithRelations } from "../_db/queries.server";

interface ProjectDetailProps {
	project: ProjectWithRelations;
	locale: string;
}

export default function ProjectDetail({ project, locale }: ProjectDetailProps) {
	if (!project) {
		return null;
	}

	const tags = project.projectTagRelations.map(
		(relation) => relation.projectTag,
	);

	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-0">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<CardTitle className="text-2xl font-bold">{project.title}</CardTitle>
					<div className="flex flex-wrap gap-2">
						{tags.map((tag) => (
							<Badge key={tag.id} variant="secondary">
								{tag.name}
							</Badge>
						))}
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-6 pt-6">
				{project.images.length > 0 && (
					<Carousel className="w-full">
						<CarouselContent>
							{project.images.map((image: ProjectImage) => (
								<CarouselItem key={image.id}>
									<div className="relative aspect-video w-full overflow-hidden rounded-lg">
										<Image
											src={image.url}
											alt={image.caption || project.title}
											fill
											className="object-cover"
											sizes="(max-width: 768px) 100vw, 768px"
										/>
									</div>
									{image.caption && (
										<p className="mt-2 text-sm text-muted-foreground text-center">
											{image.caption}
										</p>
									)}
								</CarouselItem>
							))}
						</CarouselContent>
						<CarouselPrevious className="left-2" />
						<CarouselNext className="right-2" />
					</Carousel>
				)}

				<div className="prose dark:prose-invert max-w-none">
					<p className="whitespace-pre-wrap">{project.description}</p>
				</div>

				{project.links.length > 0 && (
					<div className="space-y-2">
						<h3 className="text-lg font-medium">Links</h3>
						<div className="flex flex-wrap gap-2">
							{project.links.map((link: ProjectLink) => {
								const icon =
									link.type === "github" ? (
										<Github className="h-4 w-4 mr-2" />
									) : link.type === "website" ? (
										<Globe className="h-4 w-4 mr-2" />
									) : (
										<ExternalLink className="h-4 w-4 mr-2" />
									);

								return (
									<Button key={link.id} variant="outline" asChild size="sm">
										<Link
											href={link.url}
											target="_blank"
											rel="noopener noreferrer"
										>
											{icon}
											{link.type.charAt(0).toUpperCase() + link.type.slice(1)}
										</Link>
									</Button>
								);
							})}
						</div>
					</div>
				)}

				<div className="flex justify-between items-center pt-4 border-t">
					<div className="flex items-center gap-2">
						<Link
							href={`/${locale}/user/${project.user.handle}`}
							className="text-sm text-muted-foreground hover:underline"
						>
							{project.user.name}
						</Link>
					</div>
					<p className="text-sm text-muted-foreground">
						{new Date(project.createdAt).toLocaleDateString(locale)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
