import type {
	Page,
	Project,
	ProjectImage,
	ProjectLink,
	ProjectTag,
	ProjectTagRelation,
	Tag,
	TagPage,
} from "@prisma/client";
import type { SanitizedUser } from "../types";

export interface BaseSegment {
	id: number;
	number: number;
	text: string;
}

export interface BaseTranslation {
	id: number;
	locale: string;
	text: string;
	point: number;
	createdAt: string; // ISO 文字列
	user: SanitizedUser;
	currentUserVote: UserVote | null;
}

export interface UserVote {
	isUpvote: boolean;
	updatedAt: string; // ISO 文字列
}

/** React へ渡す統一バンドル */
export interface SegmentBundle {
	parentType: "page" | "project" | "comment";
	parentId: string | number;
	segment: BaseSegment;
	translations: BaseTranslation[];
	best: BaseTranslation | null;
}

type TagPageWithTag = TagPage & {
	tag: Tag;
};
export type PageDetail = Omit<Page, "createdAt"> & {
	createdAt: string;
	user: SanitizedUser;
	tagPages: TagPageWithTag[];
	segmentBundles: SegmentBundle[];
	_count?: {
		pageComments: number;
	};
};
export type PageSummary = Omit<PageDetail, "content" | "updatedAt" | "userId">;

type TagProjectWithTag = ProjectTagRelation & {
	projectTag: ProjectTag;
};
export type ProjectDetail = Omit<Project, "createdAt"> & {
	createdAt: string;
	user: SanitizedUser;
	images: ProjectImage[];
	iconImage: ProjectImage | null;
	links: ProjectLink[];
	projectTagRelations: TagProjectWithTag[];
	segmentBundles: SegmentBundle[];
	_count?: {
		projectLikes: number;
	};
};

export type ProjectSummary = Omit<ProjectDetail, "description" | "userId">;
