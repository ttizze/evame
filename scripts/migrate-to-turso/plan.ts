import type {
	MigrationPlan,
	MigrationReport,
	SourcePage,
	SourceSnapshot,
	SourceTranslationJob,
	TargetAnnotationLink,
	TargetScripture,
	TargetSegment,
	TargetTranslation,
	TargetTranslationJob,
	TargetTranslationVote,
	TargetUser,
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

function isPublicPage(page: SourcePage): boolean {
	return page.contentKind === "PAGE" && page.status.toUpperCase() === "PUBLIC";
}

/**
 * `tipitaka`を起点に、公開状態のPAGEだけを幅優先で選ぶ。
 *
 * ここをSQLの結果任せにしないことで、source adapterを差し替えても
 * PAGE_COMMENTや、別の公開ページが計画へ混ざらない。
 */
export function selectPublicTipitakaPages(pages: SourcePage[]): SourcePage[] {
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
		.filter((page) => isPublicPage(page) && page.slug === TIPITAKA_ROOT_SLUG)
		.sort(comparePages);
	const selected: SourcePage[] = [];
	const selectedIds = new Set<number>();
	const queue = [...roots];

	while (queue.length > 0) {
		const page = queue.shift();
		if (!page || selectedIds.has(page.id) || !isPublicPage(page)) continue;

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
		kind,
		position: segment.position,
		sourceText: segment.sourceText,
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
export function buildMigrationPlan(snapshot: SourceSnapshot): MigrationPlan {
	assertUniqueIds(snapshot.pages, "page");
	assertUniqueIds(snapshot.segments, "segment");
	assertUniqueIds(snapshot.translations, "translation");
	assertUniqueIds(snapshot.translationJobs, "translation job");
	assertUniqueIds(snapshot.users, "user");

	const pages = selectPublicTipitakaPages(snapshot.pages);
	const pageIds = new Set(pages.map((page) => page.id));
	const scriptures = pages.map((page) => mapScripture(page, pageIds));

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

	const usersById = new Map(snapshot.users.map((user) => [user.id, user]));
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

	const voterIds = new Set(translationVotes.map((vote) => vote.userId));
	const translationAuthorIds = new Set(
		translations.map((translation) => translation.userId),
	);
	const requestedByIds = new Set(
		selectedJobs.flatMap((job) =>
			job.requestedBy && usersById.has(job.requestedBy)
				? [job.requestedBy]
				: [],
		),
	);
	const scriptureOwnerIds = new Set(
		pages.flatMap((page) =>
			page.ownerUserId && usersById.has(page.ownerUserId)
				? [page.ownerUserId]
				: [],
		),
	);
	const requiredUserIds = new Set([
		...voterIds,
		...translationAuthorIds,
		...requestedByIds,
		...scriptureOwnerIds,
	]);
	const users: TargetUser[] = snapshot.users
		.filter((user) => requiredUserIds.has(user.id))
		.map((user) => ({
			id: user.id,
			email: user.email,
			name: user.name,
			createdAt: normalizeTimestamp(
				user.createdAt,
				`users.${user.id}.created_at`,
			),
		}));

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
		scriptures: scriptures.length,
		segments: segments.length,
		translations: translations.length,
		translationJobs: translationJobs.length,
		translationVotes: translationVotes.length,
		annotationLinks: annotationLinks.length,
	};
	const report: MigrationReport = {
		counts,
		skipped: {
			pages: snapshot.pages.length - scriptures.length,
			segments: snapshot.segments.length - segments.length,
			translations: snapshot.translations.length - translations.length,
			translationJobs: snapshot.translationJobs.length - translationJobs.length,
			translationVotes: snapshot.votes.length - translationVotes.length,
			users: snapshot.users.length - users.length,
			annotationLinks: snapshot.annotationLinks.length - annotationLinks.length,
		},
	};

	return {
		users,
		scriptures,
		segments,
		translations,
		translationJobs,
		translationVotes,
		annotationLinks,
		report,
	};
}
