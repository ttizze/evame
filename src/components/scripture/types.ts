/**
 * 仏典一覧で必要な表示情報だけを表す型。
 * DB の行型は route の境界でこの形へ変換し、UI が保存先に依存しないようにする。
 */
export type ScriptureListItem = {
	id: string;
	slug: string;
	title: string;
	paliTitle?: string;
	hierarchy: string[];
	description?: string;
	translationCount: number;
	href: string;
};

export type TranslationCandidate = {
	id: string;
	locale?: string;
	text: string;
	voteCount: number;
	votedByViewer: boolean | null;
	createdAt?: string;
	userName: string;
	userHandle: string;
	userProfile: string;
	userIsAi: boolean;
	userTotalPoints: number;
	ownedByViewer: boolean;
	source?: "USER" | "AI";
};

export type ScriptureSegment = {
	id: string;
	kind: "PRIMARY" | "COMMENTARY";
	position: number;
	sourceText: string;
	translations: TranslationCandidate[];
};

export type SegmentAnnotationLink = {
	mainSegmentId: string;
	annotationSegmentId: string;
	createdAt: string;
};

export type ScriptureDetail = {
	id: string;
	slug: string;
	title: string;
	paliTitle?: string;
	sourceLocale?: string;
	displayLocale?: string;
	hierarchy: string[];
	sourceText: string;
	primarySegmentId?: string;
	authenticated?: boolean;
	segments: ScriptureSegment[];
	translations: TranslationCandidate[];
	annotationLinks: SegmentAnnotationLink[];
	availableLocales?: Array<{ code: string; label: string }>;
};

export type ScriptureBreadcrumbItem = {
	label: string;
	href?: string;
	current?: boolean;
};

export type VoteResult = {
	voted: boolean | null;
	voteCount: number;
};

export type SubmitTranslationVote = (input: {
	candidateId: string;
	value: "up" | "down" | "remove";
	currentVote?: boolean | null;
}) => Promise<VoteResult>;

export type CreateTranslation = (input: {
	segmentId: string;
	locale: string;
	text: string;
}) => Promise<TranslationCandidate>;

export type TranslationJobStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "FAILED";

export type TranslationJob = {
	id: string;
	status: TranslationJobStatus;
};

export type CreateTranslationJob = (input: {
	scriptureId: string;
	locale: string;
	model?: string;
}) => Promise<TranslationJob>;

export type GetTranslationJob = (jobId: string) => Promise<TranslationJob>;
