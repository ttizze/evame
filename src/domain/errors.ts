export type DomainErrorCode =
	| "INVALID_INPUT"
	| "NOT_FOUND"
	| "FORBIDDEN"
	| "UNAUTHENTICATED";

export class DomainError extends Error {
	readonly code: DomainErrorCode;

	constructor(code: DomainErrorCode, message: string) {
		super(message);
		this.name = "DomainError";
		this.code = code;
	}
}

export class InvalidInputError extends DomainError {
	constructor(message = "入力値が不正です") {
		super("INVALID_INPUT", message);
		this.name = "InvalidInputError";
	}
}

export class NotFoundError extends DomainError {
	constructor(message = "対象が見つかりません") {
		super("NOT_FOUND", message);
		this.name = "NotFoundError";
	}
}

export class ForbiddenError extends DomainError {
	constructor(message = "この操作は許可されていません") {
		super("FORBIDDEN", message);
		this.name = "ForbiddenError";
	}
}

export class UnauthenticatedError extends DomainError {
	constructor(message = "認証が必要です") {
		super("UNAUTHENTICATED", message);
		this.name = "UnauthenticatedError";
	}
}
