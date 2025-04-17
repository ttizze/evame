import { ProjectLikeButton } from "@/app/[locale]/_components/project/project-like-button/server";
import { ProjectTagList } from "@/app/[locale]/_components/project/project-tag-list.server";
import type { ProjectWithRelations } from "@/app/[locale]/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import type { ProjectImage } from "@prisma/client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
const DynamicMemoizedParsedContent = dynamic(
	() =>
		import(
			"@/app/[locale]/(common-layout)/user/[handle]/page/[slug]/_components/parsed-content"
		).then((mod) => mod.MemoizedParsedContent),
	{
		loading: () => <span>Loading Parsed Content...</span>,
	},
);
interface ProjectDetailProps {
	project: ProjectWithRelations;
	locale: string;
}

export function ProjectDetail({ project, locale }: ProjectDetailProps) {
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
				</div>
			</CardHeader>

			<CardContent className="space-y-6 pt-6">
				{project.images.length > 0 && (
					<Carousel className="w-full">
						<CarouselContent>
							{project.images.map((image: ProjectImage) => (
								<CarouselItem key={image.id} className="basis-1/3">
									<div className="relative aspect-video w-full overflow-hidden rounded-lg">
										<Image
											src={image.url}
											alt={image.caption || project.title}
											fill
											className="object-contain"
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
				<div className="flex justify-between items-center">
					<ProjectLikeButton projectId={project.id} />
				</div>
				{/* <div className="prose dark:prose-invert max-w-none"></div> */}
				<div className="flex flex-wrap gap-2">
					<ProjectTagList projectTag={tags} />
				</div>
				{project.links.length > 0 && (
					<div className="space-y-2">
						<h3 className="text-lg font-medium">Links</h3>
						<ul className="pl-5 space-y-1">
							{project.links.map((link) => (
								<li key={link.id} className="hover:underline">
									<Link
										href={link.url}
										target="_blank"
										rel="noopener noreferrer"
									>
										{link.description}
									</Link>
								</li>
							))}
						</ul>
					</div>
				)}

				<div className="flex justify-between items-center pt-4 border-t">
					<p className="text-sm text-muted-foreground">
						{new Date(project.createdAt).toLocaleDateString(locale)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
