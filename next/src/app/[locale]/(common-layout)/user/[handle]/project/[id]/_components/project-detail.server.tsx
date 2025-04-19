import { ProjectActionsDropdown } from "@/app/[locale]/_components/project/project-actions-dropdown/client";
import { ProjectLikeButton } from "@/app/[locale]/_components/project/project-like-button/server";
import { ProjectTagList } from "@/app/[locale]/_components/project/project-tag-list.server";
import { SegmentAndTranslationSection } from "@/app/[locale]/_components/segment-and-translation-section/client";
import type { ProjectDetail } from "@/app/[locale]/types";
import { getCurrentUser } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectImage } from "@prisma/client";
import { ExternalLink } from "lucide-react";
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
interface ProjectProps {
	projectDetail: ProjectDetail;
	locale: string;
}

export async function Project({ projectDetail, locale }: ProjectProps) {
	if (!projectDetail) {
		return null;
	}
	const currentUser = await getCurrentUser();
	const isOwner = currentUser?.handle === projectDetail.user.handle;
	const projectTagLineSegmentBundle = projectDetail.segmentBundles.filter(
		(item) => item.segment.number === 0,
	)[0];
	const tags = projectDetail.projectTagRelations.map(
		(relation) => relation.projectTag,
	);
	const projectImages = projectDetail.images.filter(
		(image) => image.id !== projectDetail.iconImage?.id,
	);

	return (
		<Card className="overflow-hidden">
			<CardHeader className="pb-0 flex justify-between">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<CardTitle className="text-2xl flex items-center gap-2 font-bold">
						<div className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded">
							{projectDetail.iconImage ? (
								<Image
									src={projectDetail.iconImage.url}
									alt={projectDetail.title || ""}
									fill
									className="object-cover"
									sizes="96px"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
									{projectDetail.title.charAt(0).toUpperCase()}
								</div>
							)}
						</div>
						<div className="">
							{projectDetail.title}
							<h2 className="text-lg font-medium">
								<SegmentAndTranslationSection
									segmentBundle={projectTagLineSegmentBundle}
									currentHandle={projectDetail.user.handle}
								/>
							</h2>
						</div>
					</CardTitle>
					{isOwner && (
						<ProjectActionsDropdown
							projectId={projectDetail.id}
							projectOwnerHandle={projectDetail.user.handle}
						/>
					)}
				</div>
			</CardHeader>
			<CardContent className="pt-6">
				<div className="flex flex-wrap gap-2">
					<ProjectTagList projectTag={tags} />
				</div>
				<div className="flex justify-end items-center">
					<DropdownMenu>
						<DropdownMenuTrigger className="border rounded-full px-5 py-1 mr-2 flex items-center gap-1 text-lg font-medium">
							<ExternalLink className="w-4 h-4 mr-2" />
							Visit
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start">
							{projectDetail.links.length > 0 &&
								projectDetail.links.map((link) => (
									<DropdownMenuItem key={link.id} asChild>
										<Link
											href={link.url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex items-center justify-between w-full"
										>
											<span>{link.description}</span>
										</Link>
									</DropdownMenuItem>
								))}
						</DropdownMenuContent>
					</DropdownMenu>
					<ProjectLikeButton projectId={projectDetail.id} />
				</div>

				<div className="prose dark:prose-invert max-w-none">
					<DynamicMemoizedParsedContent
						html={projectDetail.description}
						segmentBundles={projectDetail.segmentBundles}
						currentHandle={projectDetail.user.handle}
					/>
				</div>
				{projectImages.length > 0 && (
					<Carousel className="w-full">
						<CarouselContent>
							{projectImages.map((image: ProjectImage) => (
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

				<div className="flex justify-between items-center pt-4 border-t">
					<p className="text-sm text-muted-foreground">
						{new Date(projectDetail.createdAt).toLocaleString(locale)}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}
