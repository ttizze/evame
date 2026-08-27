import type {
	MigrationPlan,
	MigrationReport,
	SourcePage,
	SourceSnapshot,
	SourceTranslationJob,
	TargetAnnotationLink,
	TargetImportFile,
	TargetImportRun,
	TargetLikePage,
	TargetNotification,
	TargetPageLocaleTranslationProof,
	TargetPageView,
	TargetPersonalAccessToken,
	TargetScripture,
	TargetSegment,
	TargetSegmentMetadata,
	TargetSegmentMetadataType,
	TargetSegmentType,
	TargetTag,
	TargetTagPage,
	TargetTranslation,
	TargetTranslationContext,
	TargetTranslationJob,
	TargetTranslationVote,
	TargetUser,
	TargetUserSettings,
} from "./types";

const TIPITAKA_ROOT_SLUG = "tipitaka";

/**
 * PostgreSQLの日時をTursoへ渡す不変のUTC文字列へ揃える。
 * SQLite側の日時型を暗黙変換に任せないため、計画生成時点で正規化する。
 */
export function normalizeTimestamp(
	value: string | Date | number,
	fieldName: string,
): string {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		throw new Error(`Invalid timestamp in ${fieldName}`);
	}
	return date.toISOString();
}

function normalizeOptionalTimestamp(
	value: string | Date | number | null,
	fieldName: string,
): string | null {
	return value === null ? null : normalizeTimestamp(value, fieldName);
}

function comparePages(a: SourcePage, b: SourcePage): number {
	if (a.position !== b.position) return a.position - b.position;
	return a.id - b.id;
}

function isTipitakaPage(page: SourcePage): boolean {
	return (
		page.contentKind === "PAGE" &&
		page.status.toUpperCase() === "ARCHIVE" &&
		page.sourceLocale.toLowerCase() === "pi"
	);
}

/**
 * 指定したroot slugを起点に、ARCHIVEかつpiのPAGEだけを幅優先で選ぶ。
 *
 * ここをSQLの結果任せにしないことで、source adapterを差し替えても
 * PAGE_COMMENTや、別状態・別localeのページが計画へ混ざらない。
 */
export function selectTipitakaPages(
	pages: SourcePage[],
	rootSlug = TIPITAKA_ROOT_SLUG,
): SourcePage[] {
	const childrenByParent = new Map<number, SourcePage[]>();
	for (const page of pages) {
		if (page.parentId === null) continue;
		const children = childrenByParent.get(page.parentId) ?? [];
		children.push(page);
		childrenByParent.set(page.parentId, children);
	}
	for (const children of childrenByParent.values()) {
		children.sort(comparePages);
	}

	const roots = pages
		.filter((page) => isTipitakaPage(page) && page.slug === rootSlug)
		.sort(comparePages);
	const selected: SourcePage[] = [];
	const selectedIds = new Set<number>();
	const queue = [...roots];

	while (queue.length > 0) {
		const page = queue.shift();
		if (!page || selectedIds.has(page.id) || !isTipitakaPage(page)) continue;

		selectedIds.add(page.id);
		selected.push(page);
		for (const child of childrenByParent.get(page.id) ?? []) {
			if (!selectedIds.has(child.id)) queue.push(child);
		}
	}

	return selected;
}

function assertUniqueIds<T extends { id: number | string }>(
	rows: T[],
	entityName: string,
): void {
	const ids = new Set<number | string>();
	for (const row of rows) {
		if (ids.has(row.id)) {
			throw new Error(`Duplicate ${entityName} id in source snapshot`);
		}
		ids.add(row.id);
	}
}

function assertUniqueIdentity(
	identities: Iterable<string>,
	entityName: string,
): void {
	const seen = new Set<string>();
	for (const identity of identities) {
		if (seen.has(identity)) {
			throw new Error(`Duplicate ${entityName} identity in source snapshot`);
		}
		seen.add(identity);
	}
}

function mapScripture(
	page: SourcePage,
	selectedPageIds: ReadonlySet<number>,
): TargetScripture {
	return {
		id: page.id,
		slug: page.slug,
		title: page.title?.trim() || page.slug,
		sourceLocale: page.sourceLocale,
		ownerUserId: page.ownerUserId ?? null,
		importFileId: page.importFileId ?? null,
		parentId:
			page.parentId !== null && selectedPageIds.has(page.parentId)
				? page.parentId
				: null,
		position: page.position,
		publishedAt: normalizeOptionalTimestamp(
			page.publishedAt,
			`pages.${page.id}.published_at`,
		),
	};
}

function mapSegment(
	segment: SourceSnapshot["segments"][number],
): TargetSegment | null {
	const kind = segment.kind.toUpperCase();
	if (kind !== "PRIMARY" && kind !== "COMMENTARY") return null;

	return {
		id: segment.id,
		scriptureId: segment.contentId,
		segmentTypeId: segment.segmentTypeId,
		kind,
		position: segment.position,
		sourceText: segment.sourceText,
		textAndOccurrenceHash: segment.textAndOccurrenceHash,
		createdAt: normalizeTimestamp(
			segment.createdAt,
			`segments.${segment.id}.created_at`,
		),
	};
}

function normalizeJobStatus(
	job: SourceTranslationJob,
): TargetTranslationJob["status"] {
	return job.status.toUpperCase() === "COMPLETED" ? "COMPLETED" : "FAILED";
}

function mapTranslationJob(
	job: SourceTranslationJob,
	total: number,
	usersById: ReadonlyMap<string, SourceSnapshot["users"][number]>,
): TargetTranslationJob {
	const status = normalizeJobStatus(job);
	const error =
		status === "FAILED" && job.error.trim().length === 0
			? "Migrated incomplete translation job; rerun required."
			: job.error;
	return {
		id: String(job.id),
		scriptureId: job.pageId,
		locale: job.locale,
		model: job.model,
		translationContext: job.translationContext ?? "",
		status,
		progress: job.progress,
		total,
		error,
		requestedBy:
			job.requestedBy && usersById.has(job.requestedBy)
				? job.requestedBy
				: null,
		createdAt: normalizeTimestamp(
			job.createdAt,
			`translation_jobs.${job.id}.created_at`,
		),
		updatedAt: normalizeTimestamp(
			job.updatedAt,
			`translation_jobs.${job.id}.updated_at`,
		),
	};
}

/**
 * Source snapshotを新schemaのupsert可能な行集合へ変換する。
 * データベース書き込みは行わず、dry-runと実行時の件数照合で同じ計画を使う。
 */
export function buildMigrationPlan(
	snapshot: SourceSnapshot,
	rootSlug = TIPITAKA_ROOT_SLUG,
): MigrationPlan {
	assertUniqueIds(snapshot.pages, "page");
	assertUniqueIds(snapshot.segments, "segment");
	assertUniqueIds(snapshot.translations, "translation");
	assertUniqueIds(snapshot.translationJobs, "translation job");
	assertUniqueIds(snapshot.users, "user");
	assertUniqueIds(snapshot.accounts, "account");
	assertUniqueIds(snapshot.sessions, "session");
	assertUniqueIds(snapshot.verifications, "verification");
	assertUniqueIds(snapshot.geminiApiKeys, "Gemini API key");
	assertUniqueIds(snapshot.personalAccessTokens, "personal access token");
	assertUniqueIds(snapshot.importRuns, "import run");
	assertUniqueIds(snapshot.importFiles, "import file");
	assertUniqueIds(snapshot.likePages, "page like");
	assertUniqueIds(snapshot.notifications, "notification");
	assertUniqueIds(snapshot.segmentTypes, "segment type");
	assertUniqueIds(
		snapshot.pageLocaleTranslationProofs,
		"page locale translation proof",
	);
	assertUniqueIds(snapshot.segmentMetadataTypes, "segment metadata type");
	assertUniqueIds(snapshot.tags, "tag");
	assertUniqueIds(snapshot.translationContexts, "translation context");
	assertUniqueIds(snapshot.segmentMetadata, "segment metadata");
	assertUniqueIds(snapshot.userSettings, "user settings");

	const pages = selectTipitakaPages(snapshot.pages, rootSlug);
	const pageIds = new Set(pages.map((page) => page.id));
	const scriptures = pages.map((page) => mapScripture(page, pageIds));

	const usersById = new Map(snapshot.users.map((user) => [user.id, user]));
	const users: TargetUser[] = snapshot.users
		.map((user) => ({
			id: user.id,
			email: user.email,
			name: user.name,
			handle: user.handle,
			profile: user.profile,
			totalPoints: user.totalPoints,
			isAi: user.isAi,
			image: user.image,
			plan: user.plan,
			provider: user.provider,
			twitterHandle: user.twitterHandle,
			emailVerified: user.emailVerified,
			createdAt: normalizeTimestamp(
				user.createdAt,
				`users.${user.id}.created_at`,
			),
			updatedAt: normalizeTimestamp(
				user.updatedAt,
				`users.${user.id}.updated_at`,
			),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));

	for (const account of snapshot.accounts) {
		if (!usersById.has(account.userId)) {
			throw new Error(
				`Account user not found in source snapshot: ${account.userId}`,
			);
		}
	}
	for (const session of snapshot.sessions) {
		if (!usersById.has(session.userId)) {
			throw new Error(
				`Session user not found in source snapshot: ${session.userId}`,
			);
		}
	}
	for (const geminiApiKey of snapshot.geminiApiKeys) {
		if (!usersById.has(geminiApiKey.userId)) {
			throw new Error(
				`Gemini API key user not found in source snapshot: ${geminiApiKey.userId}`,
			);
		}
	}
	for (const token of snapshot.personalAccessTokens) {
		if (!usersById.has(token.userId)) {
			throw new Error(
				`Personal access token user not found in source snapshot: ${token.userId}`,
			);
		}
	}
	for (const notification of snapshot.notifications) {
		if (
			!usersById.has(notification.userId) ||
			!usersById.has(notification.actorId)
		) {
			throw new Error("Notification user not found in source snapshot");
		}
	}
	for (const context of snapshot.translationContexts) {
		if (!usersById.has(context.userId)) {
			throw new Error(
				`Translation context user not found in source snapshot: ${context.userId}`,
			);
		}
	}
	for (const settings of snapshot.userSettings) {
		if (!usersById.has(settings.userId)) {
			throw new Error(
				`User settings user not found in source snapshot: ${settings.userId}`,
			);
		}
	}
	for (const like of snapshot.likePages) {
		if (like.userId !== null && !usersById.has(like.userId)) {
			throw new Error(
				`Page like user not found in source snapshot: ${like.userId}`,
			);
		}
	}

	const accounts = snapshot.accounts
		.map((account) => ({
			id: account.id,
			userId: account.userId,
			providerId: account.providerId,
			accountId: account.accountId,
			refreshToken: account.refreshToken,
			accessToken: account.accessToken,
			scope: account.scope,
			idToken: account.idToken,
			password: account.password,
			refreshTokenExpiresAt: normalizeOptionalTimestamp(
				account.refreshTokenExpiresAt,
				`accounts.${account.id}.refresh_token_expires_at`,
			),
			accessTokenExpiresAt: normalizeOptionalTimestamp(
				account.accessTokenExpiresAt,
				`accounts.${account.id}.access_token_expires_at`,
			),
			createdAt: normalizeTimestamp(
				account.createdAt,
				`accounts.${account.id}.created_at`,
			),
			updatedAt: normalizeTimestamp(
				account.updatedAt,
				`accounts.${account.id}.updated_at`,
			),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));

	const sessions = snapshot.sessions
		.map((session) => ({
			id: session.id,
			token: session.token,
			userId: session.userId,
			expiresAt: normalizeTimestamp(
				session.expiresAt,
				`sessions.${session.id}.expires_at`,
			),
			ipAddress: session.ipAddress,
			userAgent: session.userAgent,
			createdAt: normalizeTimestamp(
				session.createdAt,
				`sessions.${session.id}.created_at`,
			),
			updatedAt: normalizeTimestamp(
				session.updatedAt,
				`sessions.${session.id}.updated_at`,
			),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));

	const verifications = snapshot.verifications
		.map((verification) => ({
			id: verification.id,
			identifier: verification.identifier,
			value: verification.value,
			expiresAt: normalizeTimestamp(
				verification.expiresAt,
				`verifications.${verification.id}.expires_at`,
			),
			createdAt: normalizeOptionalTimestamp(
				verification.createdAt,
				`verifications.${verification.id}.created_at`,
			),
			updatedAt: normalizeOptionalTimestamp(
				verification.updatedAt,
				`verifications.${verification.id}.updated_at`,
			),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));

	const geminiApiKeys = snapshot.geminiApiKeys
		.map((apiKey) => ({
			id: apiKey.id,
			userId: apiKey.userId,
			apiKey: apiKey.apiKey,
		}))
		.sort((a, b) => a.id - b.id);

	const personalAccessTokens: TargetPersonalAccessToken[] =
		snapshot.personalAccessTokens
			.map((token) => ({
				id: token.id,
				keyHash: token.keyHash,
				userId: token.userId,
				name: token.name,
				createdAt: normalizeTimestamp(
					token.createdAt,
					`personal_access_tokens.${token.id}.created_at`,
				),
				lastUsedAt: normalizeOptionalTimestamp(
					token.lastUsedAt,
					`personal_access_tokens.${token.id}.last_used_at`,
				),
			}))
			.sort((a, b) => a.id - b.id);

	const notifications: TargetNotification[] = snapshot.notifications
		.map((notification) => ({
			id: notification.id,
			userId: notification.userId,
			type: notification.type,
			read: notification.read,
			createdAt: normalizeTimestamp(
				notification.createdAt,
				`notifications.${notification.id}.created_at`,
			),
			actorId: notification.actorId,
			pageCommentId: notification.pageCommentId,
			pageId: notification.pageId,
			segmentTranslationId: notification.segmentTranslationId,
		}))
		.sort((a, b) => a.id - b.id);

	const segmentTypes: TargetSegmentType[] = snapshot.segmentTypes
		.map((segmentType) => ({
			id: segmentType.id,
			label: segmentType.label,
			key: segmentType.key,
		}))
		.sort((a, b) => a.id - b.id);

	const segmentMetadataTypes: TargetSegmentMetadataType[] =
		snapshot.segmentMetadataTypes
			.map((metadataType) => ({
				id: metadataType.id,
				key: metadataType.key,
				label: metadataType.label,
			}))
			.sort((a, b) => a.id - b.id);

	const tags: TargetTag[] = snapshot.tags
		.map((tag) => ({ id: tag.id, name: tag.name }))
		.sort((a, b) => a.id - b.id);

	const translationContexts: TargetTranslationContext[] =
		snapshot.translationContexts
			.map((context) => ({
				id: context.id,
				userId: context.userId,
				name: context.name,
				context: context.context,
				createdAt: normalizeTimestamp(
					context.createdAt,
					`translation_contexts.${context.id}.created_at`,
				),
				updatedAt: normalizeTimestamp(
					context.updatedAt,
					`translation_contexts.${context.id}.updated_at`,
				),
			}))
			.sort((a, b) => a.id - b.id);

	const userSettings: TargetUserSettings[] = snapshot.userSettings
		.map((settings) => ({
			id: settings.id,
			userId: settings.userId,
			targetLocales: JSON.stringify(settings.targetLocales),
			createdAt: normalizeTimestamp(
				settings.createdAt,
				`user_settings.${settings.id}.created_at`,
			),
			updatedAt: normalizeTimestamp(
				settings.updatedAt,
				`user_settings.${settings.id}.updated_at`,
			),
		}))
		.sort((a, b) => a.id - b.id);

	const selectedPageIds = pageIds;
	const selectedImportFileIds = new Set(
		pages.flatMap((page) =>
			page.importFileId === null || page.importFileId === undefined
				? []
				: [page.importFileId],
		),
	);
	for (const page of pages) {
		if (
			page.importFileId !== null &&
			page.importFileId !== undefined &&
			!snapshot.importFiles.some((file) => file.id === page.importFileId)
		) {
			throw new Error(
				`Import file not found in source snapshot: ${page.importFileId}`,
			);
		}
	}
	const selectedImportFiles = snapshot.importFiles.filter((file) =>
		selectedImportFileIds.has(file.id),
	);
	for (const file of selectedImportFiles) {
		if (!snapshot.importRuns.some((run) => run.id === file.importRunId)) {
			throw new Error(
				`Import file run not found in source snapshot: ${file.importRunId}`,
			);
		}
	}
	const selectedImportRunIds = new Set(
		selectedImportFiles.map((file) => file.importRunId),
	);
	const importRuns: TargetImportRun[] = snapshot.importRuns
		.filter((run) => selectedImportRunIds.has(run.id))
		.map((run) => ({
			id: run.id,
			startedAt: normalizeTimestamp(
				run.startedAt,
				`import_runs.${run.id}.started_at`,
			),
			finishedAt: normalizeOptionalTimestamp(
				run.finishedAt,
				`import_runs.${run.id}.finished_at`,
			),
			status: run.status,
		}))
		.sort((a, b) => a.id - b.id);
	const importFiles: TargetImportFile[] = selectedImportFiles
		.map((file) => ({
			id: file.id,
			importRunId: file.importRunId,
			path: file.path,
			checksum: file.checksum,
			status: file.status,
			message: file.message,
			createdAt: normalizeTimestamp(
				file.createdAt,
				`import_files.${file.id}.created_at`,
			),
		}))
		.sort((a, b) => a.id - b.id);

	const likePages: TargetLikePage[] = snapshot.likePages
		.filter((like) => selectedPageIds.has(like.pageId))
		.map((like) => ({
			id: like.id,
			pageId: like.pageId,
			createdAt: normalizeTimestamp(
				like.createdAt,
				`like_pages.${like.id}.created_at`,
			),
			userId: like.userId,
		}))
		.sort((a, b) => a.id - b.id);
	assertUniqueIdentity(
		likePages
			.filter((like) => like.userId !== null)
			.map((like) => `${like.userId}\u0000${like.pageId}`),
		"page like",
	);

	const pageLocaleTranslationProofs: TargetPageLocaleTranslationProof[] =
		snapshot.pageLocaleTranslationProofs
			.filter((proof) => selectedPageIds.has(proof.pageId))
			.map((proof) => ({
				id: proof.id,
				pageId: proof.pageId,
				locale: proof.locale,
				translationProofStatus: proof.translationProofStatus,
			}))
			.sort((a, b) => a.id - b.id);
	assertUniqueIdentity(
		pageLocaleTranslationProofs.map(
			(proof) => `${proof.pageId}\u0000${proof.locale}`,
		),
		"page locale translation proof",
	);

	const selectedSegments = snapshot.segments.filter((segment) =>
		pageIds.has(segment.contentId),
	);
	const segments = selectedSegments
		.map(mapSegment)
		.filter((segment): segment is TargetSegment => segment !== null)
		.sort(
			(a, b) =>
				a.scriptureId - b.scriptureId || a.position - b.position || a.id - b.id,
		);
	const segmentIds = new Set(segments.map((segment) => segment.id));

	const pageViews: TargetPageView[] = snapshot.pageViews
		.filter((view) => selectedPageIds.has(view.pageId))
		.map((view) => ({ pageId: view.pageId, count: view.count }))
		.sort((a, b) => a.pageId - b.pageId);

	const segmentMetadata: TargetSegmentMetadata[] = snapshot.segmentMetadata
		.filter(
			(metadata) =>
				segmentIds.has(metadata.segmentId) &&
				snapshot.segmentMetadataTypes.some(
					(type) => type.id === metadata.metadataTypeId,
				),
		)
		.map((metadata) => ({
			id: metadata.id,
			segmentId: metadata.segmentId,
			metadataTypeId: metadata.metadataTypeId,
			value: metadata.value,
			createdAt: normalizeTimestamp(
				metadata.createdAt,
				`segment_metadata.${metadata.id}.created_at`,
			),
		}))
		.sort((a, b) => a.id - b.id);
	assertUniqueIdentity(
		segmentMetadata.map(
			(metadata) =>
				`${metadata.segmentId}\u0000${metadata.metadataTypeId}\u0000${metadata.value}`,
		),
		"segment metadata",
	);

	const tagPages: TargetTagPage[] = snapshot.tagPages
		.filter((tagPage) => selectedPageIds.has(tagPage.pageId))
		.map((tagPage) => ({
			tagId: tagPage.tagId,
			pageId: tagPage.pageId,
		}))
		.sort((a, b) => a.tagId - b.tagId || a.pageId - b.pageId);
	const tagIds = new Set(snapshot.tags.map((tag) => tag.id));
	for (const tagPage of tagPages) {
		if (!tagIds.has(tagPage.tagId)) {
			throw new Error(`Tag not found in source snapshot: ${tagPage.tagId}`);
		}
	}
	assertUniqueIdentity(
		tagPages.map((tagPage) => `${tagPage.tagId}\u0000${tagPage.pageId}`),
		"tag page",
	);

	for (const page of pages) {
		if (page.ownerUserId && !usersById.has(page.ownerUserId)) {
			throw new Error(
				`Scripture owner not found in source snapshot: ${page.ownerUserId}`,
			);
		}
	}
	const selectedJobs = snapshot.translationJobs.filter((job) =>
		pageIds.has(job.pageId),
	);
	const segmentCountByScriptureId = new Map<number, number>();
	for (const segment of segments) {
		segmentCountByScriptureId.set(
			segment.scriptureId,
			(segmentCountByScriptureId.get(segment.scriptureId) ?? 0) + 1,
		);
	}

	const translationJobs: TargetTranslationJob[] = selectedJobs
		.map((job) =>
			mapTranslationJob(
				job,
				segmentCountByScriptureId.get(job.pageId) ?? 0,
				usersById,
			),
		)
		.sort((a, b) => a.id.localeCompare(b.id));
	const jobsByScriptureAndLocale = new Map<string, SourceTranslationJob[]>();
	for (const job of selectedJobs) {
		const key = `${job.pageId}\u0000${job.locale}`;
		const jobs = jobsByScriptureAndLocale.get(key) ?? [];
		jobs.push(job);
		jobsByScriptureAndLocale.set(key, jobs);
	}

	const selectedTranslations = snapshot.translations.filter(
		(translation) =>
			segmentIds.has(translation.segmentId) &&
			usersById.has(translation.userId) &&
			translation.locale.trim().length > 0 &&
			translation.text.trim().length > 0,
	);
	const translations: TargetTranslation[] = selectedTranslations
		.map((translation) => {
			const author = usersById.get(translation.userId);
			if (!author) {
				throw new Error(
					`Translation author not found in source snapshot: ${translation.id}`,
				);
			}
			const source: TargetTranslation["source"] = author.isAi ? "AI" : "USER";
			const segment = segments.find(
				(candidate) => candidate.id === translation.segmentId,
			);
			const jobCandidates = segment
				? (jobsByScriptureAndLocale.get(
						`${segment.scriptureId}\u0000${translation.locale}`,
					) ?? [])
				: [];
			return {
				id: translation.id,
				segmentId: translation.segmentId,
				locale: translation.locale,
				text: translation.text,
				point: translation.point,
				userId: translation.userId,
				source,
				aiJobId:
					source === "AI" && jobCandidates.length === 1
						? String(jobCandidates[0]?.id)
						: null,
				createdAt: normalizeTimestamp(
					translation.createdAt,
					`segment_translations.${translation.id}.created_at`,
				),
				updatedAt: normalizeTimestamp(
					translation.updatedAt ?? translation.createdAt,
					`segment_translations.${translation.id}.updated_at`,
				),
			};
		})
		.sort((a, b) => a.id - b.id);
	const translationIds = new Set(
		translations.map((translation) => translation.id),
	);

	const validVotes = snapshot.votes.filter(
		(vote) =>
			translationIds.has(vote.translationId) && usersById.has(vote.userId),
	);
	assertUniqueIdentity(
		validVotes.map((vote) => `${vote.translationId}\u0000${vote.userId}`),
		"translation vote",
	);
	const translationVotes: TargetTranslationVote[] = validVotes
		.map((vote) => ({
			translationId: vote.translationId,
			userId: vote.userId,
			isUpvote: vote.isUpvote,
			createdAt: normalizeTimestamp(
				vote.createdAt,
				`translation_votes.${vote.translationId}.created_at`,
			),
			updatedAt: normalizeTimestamp(
				vote.updatedAt,
				`translation_votes.${vote.translationId}.updated_at`,
			),
		}))
		.sort(
			(a, b) =>
				a.translationId - b.translationId || a.userId.localeCompare(b.userId),
		);

	const selectedAnnotationLinks = snapshot.annotationLinks.filter(
		(link) =>
			segmentIds.has(link.mainSegmentId) &&
			segmentIds.has(link.annotationSegmentId),
	);
	assertUniqueIdentity(
		selectedAnnotationLinks.map(
			(link) => `${link.mainSegmentId}\u0000${link.annotationSegmentId}`,
		),
		"segment annotation link",
	);
	const annotationLinks: TargetAnnotationLink[] = selectedAnnotationLinks
		.map((link) => ({
			mainSegmentId: link.mainSegmentId,
			annotationSegmentId: link.annotationSegmentId,
			createdAt: normalizeTimestamp(
				link.createdAt,
				`segment_annotation_links.${link.mainSegmentId}.created_at`,
			),
		}))
		.sort(
			(a, b) =>
				a.mainSegmentId - b.mainSegmentId ||
				a.annotationSegmentId - b.annotationSegmentId,
		);

	const counts = {
		users: users.length,
		accounts: accounts.length,
		sessions: sessions.length,
		verifications: verifications.length,
		geminiApiKeys: geminiApiKeys.length,
		personalAccessTokens: personalAccessTokens.length,
		importRuns: importRuns.length,
		importFiles: importFiles.length,
		likePages: likePages.length,
		notifications: notifications.length,
		segmentTypes: segmentTypes.length,
		pageLocaleTranslationProofs: pageLocaleTranslationProofs.length,
		segmentMetadataTypes: segmentMetadataTypes.length,
		tags: tags.length,
		translationContexts: translationContexts.length,
		pageViews: pageViews.length,
		segmentMetadata: segmentMetadata.length,
		userSettings: userSettings.length,
		tagPages: tagPages.length,
		scriptures: scriptures.length,
		segments: segments.length,
		translations: translations.length,
		translationJobs: translationJobs.length,
		translationVotes: translationVotes.length,
		annotationLinks: annotationLinks.length,
	} as MigrationReport["counts"];
	const report: MigrationReport = {
		counts,
		skipped: {
			pages: snapshot.pages.length - scriptures.length,
			accounts: snapshot.accounts.length - accounts.length,
			sessions: snapshot.sessions.length - sessions.length,
			verifications: snapshot.verifications.length - verifications.length,
			geminiApiKeys: snapshot.geminiApiKeys.length - geminiApiKeys.length,
			personalAccessTokens:
				snapshot.personalAccessTokens.length - personalAccessTokens.length,
			importRuns: snapshot.importRuns.length - importRuns.length,
			importFiles: snapshot.importFiles.length - importFiles.length,
			likePages: snapshot.likePages.length - likePages.length,
			notifications: snapshot.notifications.length - notifications.length,
			segmentTypes: snapshot.segmentTypes.length - segmentTypes.length,
			pageLocaleTranslationProofs:
				snapshot.pageLocaleTranslationProofs.length -
				pageLocaleTranslationProofs.length,
			segmentMetadataTypes:
				snapshot.segmentMetadataTypes.length - segmentMetadataTypes.length,
			tags: snapshot.tags.length - tags.length,
			translationContexts:
				snapshot.translationContexts.length - translationContexts.length,
			pageViews: snapshot.pageViews.length - pageViews.length,
			segmentMetadata: snapshot.segmentMetadata.length - segmentMetadata.length,
			userSettings: snapshot.userSettings.length - userSettings.length,
			tagPages: snapshot.tagPages.length - tagPages.length,
			segments: snapshot.segments.length - segments.length,
			translations: snapshot.translations.length - translations.length,
			translationJobs: snapshot.translationJobs.length - translationJobs.length,
			translationVotes: snapshot.votes.length - translationVotes.length,
			users: snapshot.users.length - users.length,
			annotationLinks: snapshot.annotationLinks.length - annotationLinks.length,
		} as MigrationReport["skipped"],
	};

	return {
		users,
		accounts,
		sessions,
		verifications,
		geminiApiKeys,
		personalAccessTokens,
		importRuns,
		importFiles,
		likePages,
		notifications,
		segmentTypes,
		pageLocaleTranslationProofs,
		segmentMetadataTypes,
		tags,
		translationContexts,
		pageViews,
		segmentMetadata,
		userSettings,
		tagPages,
		scriptures,
		segments,
		translations,
		translationJobs,
		translationVotes,
		annotationLinks,
		report,
	};
}
