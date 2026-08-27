export type SqlValue = string | number | bigint | boolean | null | Uint8Array;

export type SqlArguments = readonly SqlValue[];

export type RunResult = {
	changes: number;
	lastInsertRowid: number | bigint | string | undefined;
};

export type SqlExecutor = {
	get<T>(sql: string, args?: SqlArguments): Promise<T | undefined>;
	all<T>(sql: string, args?: SqlArguments): Promise<T[]>;
	run(sql: string, args?: SqlArguments): Promise<RunResult>;
};

export type TursoDatabase = SqlExecutor & {
	transaction<T>(
		callback: (transaction: SqlExecutor) => Promise<T>,
	): Promise<T>;
	close(): Promise<void>;
};

export type UserRow = {
	id: string;
	email: string;
	name: string;
	created_at: string;
};

export type SessionRow = {
	id: string;
	user_id: string;
	token_hash: string;
	expires_at: string;
	created_at: string;
};

export type ScriptureRow = {
	id: number;
	slug: string;
	title: string;
	source_locale: string;
	owner_user_id: string | null;
	parent_id: number | null;
	position: number;
	published_at: string | null;
};

export type SegmentRow = {
	id: number;
	scripture_id: number;
	kind: "PRIMARY" | "COMMENTARY";
	position: number;
	source_text: string;
	created_at: string;
};

export type TranslationRow = {
	id: number;
	segment_id: number;
	locale: string;
	text: string;
	point: number;
	created_at: string;
	user_id: string;
	source: "USER" | "AI";
	ai_job_id: string | null;
	updated_at: string;
	owner_upvoted: number | boolean;
	viewer_is_upvote?: number | boolean | null;
};

export type TranslationJobRow = {
	id: string;
	scripture_id: number | null;
	locale: string;
	status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
	progress: number;
	total: number;
	error: string;
	model: string;
	requested_by: string | null;
	created_at: string;
	updated_at: string;
};

export type TranslationVoteRow = {
	translation_id: number;
	user_id: string;
	is_upvote: number | boolean;
	created_at: string;
	updated_at: string;
};

export type MagicLinkTokenRow = {
	id: string;
	email: string;
	token_hash: string;
	expires_at: string;
	used_at: string | null;
	created_at: string;
	request_ip_hash: string;
};
