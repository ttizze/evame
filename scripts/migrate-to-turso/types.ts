/**
 * PostgreSQL側から読み出す、移行対象に必要な最小限の行型。
 *
 * ここでは認証秘密値やセッション列を表現しない。source adapter が
 * SELECTする列と一致させることで、誤ってそれらを移行計画へ混ぜない。
 */
export type SourceContentKind = "PAGE" | "PAGE_COMMENT";
export type SourceSegmentKind = "PRIMARY" | "COMMENTARY" | string;

export interface SourcePage {
	id: number;
	contentKind: SourceContentKind;
	slug: string;
	title: string | null;
	sourceLocale: string;
	/** 旧pages.user_id。古いfixtureとの互換性のため入力側では省略可。 */
	ownerUserId?: string | null;
	parentId: number | null;
	position: number;
	status: string;
	publishedAt: string | Date | number | null;
	createdAt: string | Date | number;
}

export interface SourceSegment {
	id: number;
	contentId: number;
	position: number;
	kind: SourceSegmentKind;
	sourceText: string;
	createdAt: string | Date | number;
}

export interface SourceTranslation {
	id: number;
	segmentId: number;
	locale: string;
	text: string;
	point: number;
	userId: string;
	createdAt: string | Date | number;
	updatedAt?: string | Date | number;
}

export interface SourceUser {
	id: string;
	email: string;
	name: string;
	isAi: boolean;
	createdAt: string | Date | number;
}

export type SourceTranslationJobStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "FAILED"
	| string;

export interface SourceTranslationJob {
	id: number;
	pageId: number;
	locale: string;
	model: string;
	status: SourceTranslationJobStatus;
	progress: number;
	error: string;
	requestedBy: string | null;
	createdAt: string | Date | number;
	updatedAt: string | Date | number;
}

export interface SourceTranslationVote {
	translationId: number;
	userId: string;
	isUpvote: boolean;
	createdAt: string | Date | number;
	updatedAt: string | Date | number;
}

export interface SourceAnnotationLink {
	mainSegmentId: number;
	annotationSegmentId: number;
	createdAt: string | Date | number;
}

export interface SourceSnapshot {
	pages: SourcePage[];
	segments: SourceSegment[];
	translations: SourceTranslation[];
	translationJobs: SourceTranslationJob[];
	users: SourceUser[];
	votes: SourceTranslationVote[];
	annotationLinks: SourceAnnotationLink[];
}

export interface TargetUser {
	id: string;
	email: string;
	name: string;
	createdAt: string;
}

export interface TargetScripture {
	id: number;
	slug: string;
	title: string;
	sourceLocale: string;
	ownerUserId: string | null;
	parentId: number | null;
	position: number;
	publishedAt: string | null;
}

export interface TargetSegment {
	id: number;
	scriptureId: number;
	kind: "PRIMARY" | "COMMENTARY";
	position: number;
	sourceText: string;
	createdAt: string;
}

export interface TargetTranslation {
	id: number;
	segmentId: number;
	locale: string;
	text: string;
	point: number;
	userId: string;
	source: "USER" | "AI";
	aiJobId: string | null;
	createdAt: string;
	updatedAt: string;
}

export type TargetTranslationJobStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "FAILED";

export interface TargetTranslationJob {
	id: string;
	scriptureId: number | null;
	locale: string;
	model: string;
	status: TargetTranslationJobStatus;
	progress: number;
	total: number;
	error: string;
	requestedBy: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TargetTranslationVote {
	translationId: number;
	userId: string;
	isUpvote: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface TargetAnnotationLink {
	mainSegmentId: number;
	annotationSegmentId: number;
	createdAt: string;
}

export interface MigrationCounts {
	users: number;
	scriptures: number;
	segments: number;
	translations: number;
	translationJobs: number;
	translationVotes: number;
	annotationLinks: number;
}

export interface MigrationSkippedCounts {
	pages: number;
	segments: number;
	translations: number;
	translationJobs: number;
	translationVotes: number;
	users: number;
	annotationLinks: number;
}

export interface MigrationReport {
	counts: MigrationCounts;
	skipped: MigrationSkippedCounts;
}

export interface MigrationPlan {
	users: TargetUser[];
	scriptures: TargetScripture[];
	segments: TargetSegment[];
	translations: TargetTranslation[];
	translationJobs: TargetTranslationJob[];
	translationVotes: TargetTranslationVote[];
	annotationLinks: TargetAnnotationLink[];
	report: MigrationReport;
}
