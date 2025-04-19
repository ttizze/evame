// Project.tsx – refactored with CSS Grid layout (fixed actions alignment)

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
	{ loading: () => <span>Loading Parsed Content...</span> },
);

interface ProjectProps {
	projectDetail: ProjectDetail;
	locale: string;
}

export async function Project({ projectDetail, locale }: ProjectProps) {
	if (!projectDetail) return null;

	const currentUser = await getCurrentUser();
	const isOwner = currentUser?.handle === projectDetail.user.handle;

	const projectTagLineSegmentBundle = projectDetail.segmentBundles.find(
		(item) => item.segment.number === 0,
	);
	const tags = projectDetail.projectTagRelations.map((rel) => rel.projectTag);
	const projectImages = projectDetail.images.filter(
		(img) => img.id !== projectDetail.iconImage?.id,
	);

	return (
		<Card className="overflow-hidden">
			{/* ------------ Header ------------- */}
			<CardHeader className="pb-0">
				{/* Grid: [icon] [title / tagline] [actions] – always three columns */}
				<div className="grid grid-cols-[auto_1fr_auto] gap-4 items-center">
					{/* Icon */}
					<div className="relative h-16 w-24 overflow-hidden rounded-md shadow-sm">
						{projectDetail.iconImage ? (
							<Image
								src={projectDetail.iconImage.url}
								alt={projectDetail.title || ""}
								fill
								className="object-contain"
								sizes="96px"
							/>
						) : (
							<div className="flex h-full w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
								{projectDetail.title.charAt(0).toUpperCase()}
							</div>
						)}
					</div>

					{/* Title & Tag‑line */}
					<div className="flex flex-col gap-1 min-w-0">
						<CardTitle className="truncate text-2xl font-bold leading-tight">
							{projectDetail.title}
						</CardTitle>
						{projectTagLineSegmentBundle && (
							<h2 className="text-lg font-medium text-muted-foreground truncate">
								<SegmentAndTranslationSection
									segmentBundle={projectTagLineSegmentBundle}
									currentHandle={projectDetail.user.handle}
								/>
							</h2>
						)}
					</div>

					{/* Owner actions (空白列でも幅0なので邪魔しない) */}
					{isOwner && (
						<ProjectActionsDropdown
							projectId={projectDetail.id}
							projectOwnerHandle={projectDetail.user.handle}
						/>
					)}
				</div>
			</CardHeader>

			{/* ------------ Main Content ------------- */}
			<CardContent className="pt-6 grid gap-6">
				{/* Tags */}
				{tags.length > 0 && (
					<div className="grid grid-flow-col auto-cols-max gap-2">
						<ProjectTagList projectTag={tags} />
					</div>
				)}

				{/* External links + Like button */}
				<div className="flex justify-end items-center gap-2">
					{projectDetail.links.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger className="border rounded-full px-5 py-1 flex items-center gap-2 text-lg font-medium">
								<ExternalLink className="h-4 w-4" />
								Visit
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{projectDetail.links.map((link) => (
									<DropdownMenuItem key={link.id} asChild>
										<Link
											href={link.url}
											target="_blank"
											rel="noopener noreferrer"
											className="flex w-full items-center justify-between"
										>
											<span>{link.description}</span>
										</Link>
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					<ProjectLikeButton
						projectId={projectDetail.id}
						className="w-12 h-12 border rounded-full"
					/>
				</div>

				{/* Description */}
				<div className="prose dark:prose-invert max-w-none">
					<DynamicMemoizedParsedContent
						html={projectDetail.description}
						segmentBundles={projectDetail.segmentBundles}
						currentHandle={projectDetail.user.handle}
					/>
				</div>

				{/* Image carousel */}
				{projectImages.length > 0 && (
					<Carousel className="w-full">
						<CarouselContent>
							{projectImages.map((image: ProjectImage) => (
								<CarouselItem
									key={image.id}
									className="sm:basis-1/2 md:basis-1/3"
								>
									<div className="relative aspect-video w-full overflow-hidden rounded-lg shadow-sm">
										<Image
											src={image.url}
											alt={image.caption || projectDetail.title}
											fill
											className="object-contain"
											sizes="(max-width: 768px) 100vw, 768px"
										/>
									</div>
									{image.caption && (
										<p className="mt-2 text-center text-sm text-muted-foreground">
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

				{/* Created at */}
				<div className="flex justify-between border-t pt-4 text-sm text-muted-foreground">
					<span>
						{new Date(projectDetail.createdAt).toLocaleString(locale)}
					</span>
				</div>
			</CardContent>
		</Card>
	);
}
