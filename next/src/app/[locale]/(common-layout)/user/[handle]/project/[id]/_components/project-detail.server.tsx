import { ProjectLikeButton } from "@/app/[locale]/_components/project/project-like-button/server";
import { ProjectTagList } from "@/app/[locale]/_components/project/project-tag-list.server";
import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import type { ProjectDetail } from "@/app/[locale]/types";
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
	projectDetail: ProjectDetail;
	locale: string;
}

export function Project({ projectDetail, locale }: ProjectDetailProps) {
	if (!projectDetail) {
		return null;
	}
	const projectTitleSegmentBundle = projectDetail.segmentBundles.filter(
		(item) => item.segment.number === 0,
	)[0];
	const tags = projectDetail.projectTagRelations.map(
		(relation) => relation.projectTag,
	);

	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-0">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<CardTitle className="text-2xl font-bold">
						{projectDetail.title}
					</CardTitle>
				</div>
			</CardHeader>

			<CardContent className="space-y-6 pt-6">
				{projectDetail.images.length > 0 && (
					<Carousel className="w-full">
						<CarouselContent>
							{projectDetail.images.map((image: ProjectImage) => (
								<CarouselItem key={image.id} className="basis-1/3">
									<div className="relative aspect-video w-full overflow-hidden rounded-lg">
										<Image
											src={image.url}
											alt={image.caption || projectDetail.title}
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
					<ProjectLikeButton projectId={projectDetail.id} />
				</div>
				<h2 className="text-lg font-medium">
					<SegmentAndTranslationSection
						segmentBundle={projectTitleSegmentBundle}
						currentHandle={projectDetail.user.handle}
					/>
				</h2>
				<div className="prose dark:prose-invert max-w-none">
					<DynamicMemoizedParsedContent
						html={projectDetail.description}
						segmentBundles={projectDetail.segmentBundles}
						currentHandle={projectDetail.user.handle}
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					<ProjectTagList projectTag={tags} />
				</div>
				{projectDetail.links.length > 0 && (
					<div className="space-y-2">
						<h3 className="text-lg font-medium">Links</h3>
						<ul className="pl-5 space-y-1">
							{projectDetail.links.map((link) => (
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
						{new Date(projectDetail.createdAt).toLocaleString(locale)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
