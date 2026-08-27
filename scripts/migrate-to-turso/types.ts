/**
 * PostgreSQL側から読み出す移行対象の行型。
 *
 * Better Authのtoken/ciphertextとGeminiの暗号化済みkeyは復元に必要なため
 * 計画へ保持する。ただし、これらはparameterized statementの引数にだけ渡し、
 * CLIの件数・エラー出力へは決して含めない。
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
	/** contents.import_file_id。未importの行ではnull。 */
	importFileId?: number | null;
	parentId: number | null;
	position: number;
	status: string;
	publishedAt: string | Date | number | null;
	createdAt: string | Date | number;
}

export interface SourceSegment {
	id: number;
	contentId: number;
	segmentTypeId: number;
	position: number;
	kind: SourceSegmentKind;
	sourceText: string;
	textAndOccurrenceHash: string;
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
	handle: string;
	profile: string;
	totalPoints: number;
	isAi: boolean;
	image: string;
	plan: string;
	provider: string;
	twitterHandle: string;
	emailVerified: boolean | null;
	createdAt: string | Date | number;
	updatedAt: string | Date | number;
}

export interface SourceAccount {
	id: string;
	userId: string;
	providerId: string;
	accountId: string;
	refreshToken: string | null;
	accessToken: string | null;
	scope: string | null;
	idToken: string | null;
	password: string | null;
	refreshTokenExpiresAt: string | Date | number | null;
	accessTokenExpiresAt: string | Date | number | null;
	createdAt: string | Date | number;
	updatedAt: string | Date | number;
}

export interface SourceSession {
	id: string;
	token: string;
	userId: string;
	expiresAt: string | Date | number;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string | Date | number;
	updatedAt: string | Date | number;
}

export interface SourceVerification {
	id: string;
	identifier: string;
	value: string;
	expiresAt: string | Date | number;
	createdAt: string | Date | number | null;
	updatedAt: string | Date | number | null;
}

export interface SourceGeminiApiKey {
	id: number;
	userId: string;
	apiKey: string;
}

export interface SourcePersonalAccessToken {
	id: number;
	keyHash: string;
	userId: string;
	name: string;
	createdAt: string | Date | number;
	lastUsedAt: string | Date | number | null;
}

export interface SourceImportRun {
	id: number;
	startedAt: string | Date | number;
	finishedAt: string | Date | number | null;
	status: string;
}

export interface SourceImportFile {
	id: number;
	importRunId: number;
	path: string;
	checksum: string;
	status: string;
	message: string;
	createdAt: string | Date | number;
}

export interface SourceLikePage {
	id: number;
	pageId: number;
	createdAt: string | Date | number;
	userId: string | null;
}

export interface SourceNotification {
	id: number;
	userId: string;
	type: string;
	read: boolean;
	createdAt: string | Date | number;
	actorId: string;
	pageCommentId: number | null;
	pageId: number | null;
	segmentTranslationId: number | null;
}

export interface SourceSegmentType {
	id: number;
	label: string;
	key: string;
}

export interface SourcePageLocaleTranslationProof {
	id: number;
	pageId: number;
	locale: string;
	translationProofStatus: string;
}

export interface SourceSegmentMetadataType {
	id: number;
	key: string;
	label: string;
}

export interface SourceTag {
	id: number;
	name: string;
}

export interface SourceTranslationContext {
	id: number;
	userId: string;
	name: string;
	context: string;
	createdAt: string | Date | number;
	updatedAt: string | Date | number;
}

export interface SourcePageView {
	pageId: number;
	count: number;
}

export interface SourceSegmentMetadata {
	id: number;
	segmentId: number;
	metadataTypeId: number;
	value: string;
	createdAt: string | Date | number;
}

export interface SourceUserSettings {
	id: number;
	userId: string;
	targetLocales: string[];
	createdAt: string | Date | number;
	updatedAt: string | Date | number;
}

export interface SourceTagPage {
	tagId: number;
	pageId: number;
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
	/** 旧PostgreSQL sourceには列がないため、snapshotでは空文字へ補完する。 */
	translationContext?: string;
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
	accounts: SourceAccount[];
	sessions: SourceSession[];
	verifications: SourceVerification[];
	geminiApiKeys: SourceGeminiApiKey[];
	personalAccessTokens: SourcePersonalAccessToken[];
	importRuns: SourceImportRun[];
	importFiles: SourceImportFile[];
	likePages: SourceLikePage[];
	notifications: SourceNotification[];
	segmentTypes: SourceSegmentType[];
	pageLocaleTranslationProofs: SourcePageLocaleTranslationProof[];
	segmentMetadataTypes: SourceSegmentMetadataType[];
	tags: SourceTag[];
	translationContexts: SourceTranslationContext[];
	pageViews: SourcePageView[];
	segmentMetadata: SourceSegmentMetadata[];
	userSettings: SourceUserSettings[];
	tagPages: SourceTagPage[];
	votes: SourceTranslationVote[];
	annotationLinks: SourceAnnotationLink[];
}

export interface TargetUser {
	id: string;
	email: string;
	name: string;
	handle: string;
	profile: string;
	totalPoints: number;
	isAi: boolean;
	image: string;
	plan: string;
	provider: string;
	twitterHandle: string;
	emailVerified: boolean | null;
	createdAt: string;
	updatedAt: string;
}

export interface TargetAccount {
	id: string;
	userId: string;
	providerId: string;
	accountId: string;
	refreshToken: string | null;
	accessToken: string | null;
	scope: string | null;
	idToken: string | null;
	password: string | null;
	refreshTokenExpiresAt: string | null;
	accessTokenExpiresAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TargetSession {
	id: string;
	token: string;
	userId: string;
	expiresAt: string;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TargetVerification {
	id: string;
	identifier: string;
	value: string;
	expiresAt: string;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface TargetGeminiApiKey {
	id: number;
	userId: string;
	apiKey: string;
}

export interface TargetPersonalAccessToken {
	id: number;
	keyHash: string;
	userId: string;
	name: string;
	createdAt: string;
	lastUsedAt: string | null;
}

export interface TargetImportRun {
	id: number;
	startedAt: string;
	finishedAt: string | null;
	status: string;
}

export interface TargetImportFile {
	id: number;
	importRunId: number;
	path: string;
	checksum: string;
	status: string;
	message: string;
	createdAt: string;
}

export interface TargetLikePage {
	id: number;
	pageId: number;
	createdAt: string;
	userId: string | null;
}

export interface TargetNotification {
	id: number;
	userId: string;
	type: string;
	read: boolean;
	createdAt: string;
	actorId: string;
	pageCommentId: number | null;
	pageId: number | null;
	segmentTranslationId: number | null;
}

export interface TargetSegmentType {
	id: number;
	label: string;
	key: string;
}

export interface TargetPageLocaleTranslationProof {
	id: number;
	pageId: number;
	locale: string;
	translationProofStatus: string;
}

export interface TargetSegmentMetadataType {
	id: number;
	key: string;
	label: string;
}

export interface TargetTag {
	id: number;
	name: string;
}

export interface TargetTranslationContext {
	id: number;
	userId: string;
	name: string;
	context: string;
	createdAt: string;
	updatedAt: string;
}

export interface TargetPageView {
	pageId: number;
	count: number;
}

export interface TargetSegmentMetadata {
	id: number;
	segmentId: number;
	metadataTypeId: number;
	value: string;
	createdAt: string;
}

export interface TargetUserSettings {
	id: number;
	userId: string;
	targetLocales: string;
	createdAt: string;
	updatedAt: string;
}

export interface TargetTagPage {
	tagId: number;
	pageId: number;
}

export interface TargetScripture {
	id: number;
	slug: string;
	title: string;
	sourceLocale: string;
	ownerUserId: string | null;
	importFileId: number | null;
	parentId: number | null;
	position: number;
	publishedAt: string | null;
}

export interface TargetSegment {
	id: number;
	scriptureId: number;
	segmentTypeId: number;
	kind: "PRIMARY" | "COMMENTARY";
	position: number;
	sourceText: string;
	textAndOccurrenceHash: string;
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
	translationContext?: string;
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
	accounts: number;
	sessions: number;
	verifications: number;
	geminiApiKeys: number;
	personalAccessTokens: number;
	importRuns: number;
	importFiles: number;
	likePages: number;
	notifications: number;
	segmentTypes: number;
	pageLocaleTranslationProofs: number;
	segmentMetadataTypes: number;
	tags: number;
	translationContexts: number;
	pageViews: number;
	segmentMetadata: number;
	userSettings: number;
	tagPages: number;
	scriptures: number;
	segments: number;
	translations: number;
	translationJobs: number;
	translationVotes: number;
	annotationLinks: number;
}

export interface MigrationSkippedCounts {
	pages: number;
	accounts: number;
	sessions: number;
	verifications: number;
	geminiApiKeys: number;
	personalAccessTokens: number;
	importRuns: number;
	importFiles: number;
	likePages: number;
	notifications: number;
	segmentTypes: number;
	pageLocaleTranslationProofs: number;
	segmentMetadataTypes: number;
	tags: number;
	translationContexts: number;
	pageViews: number;
	segmentMetadata: number;
	userSettings: number;
	tagPages: number;
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
	accounts: TargetAccount[];
	sessions: TargetSession[];
	verifications: TargetVerification[];
	geminiApiKeys: TargetGeminiApiKey[];
	personalAccessTokens: TargetPersonalAccessToken[];
	importRuns: TargetImportRun[];
	importFiles: TargetImportFile[];
	likePages: TargetLikePage[];
	notifications: TargetNotification[];
	segmentTypes: TargetSegmentType[];
	pageLocaleTranslationProofs: TargetPageLocaleTranslationProof[];
	segmentMetadataTypes: TargetSegmentMetadataType[];
	tags: TargetTag[];
	translationContexts: TargetTranslationContext[];
	pageViews: TargetPageView[];
	segmentMetadata: TargetSegmentMetadata[];
	userSettings: TargetUserSettings[];
	tagPages: TargetTagPage[];
	scriptures: TargetScripture[];
	segments: TargetSegment[];
	translations: TargetTranslation[];
	translationJobs: TargetTranslationJob[];
	translationVotes: TargetTranslationVote[];
	annotationLinks: TargetAnnotationLink[];
	report: MigrationReport;
}
