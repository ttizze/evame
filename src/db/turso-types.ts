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
	handle: string;
	profile: string;
	total_points: number;
	is_ai: number | boolean;
	image: string;
	plan: string;
	provider: string;
	twitter_handle: string;
	email_verified: number | boolean | null;
	created_at: string;
	updated_at: string;
};

export type SessionRow = {
	id: string;
	token: string;
	user_id: string;
	expires_at: string;
	ip_address: string | null;
	user_agent: string | null;
	created_at: string;
	updated_at: string;
};

export type AccountRow = {
	id: string;
	user_id: string;
	provider_id: string;
	account_id: string;
	refresh_token: string | null;
	access_token: string | null;
	scope: string | null;
	id_token: string | null;
	password: string | null;
	refresh_token_expires_at: string | null;
	access_token_expires_at: string | null;
	created_at: string;
	updated_at: string;
};

export type VerificationRow = {
	id: string;
	identifier: string;
	value: string;
	expires_at: string;
	created_at: string | null;
	updated_at: string | null;
};

export type GeminiApiKeyRow = {
	id: number;
	api_key: string;
	user_id: string;
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
	user_name: string;
	user_handle: string;
	user_profile: string;
	user_is_ai: number | boolean;
	user_total_points: number;
	owned_by_viewer: number | boolean;
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
