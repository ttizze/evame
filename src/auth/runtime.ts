import type { AuthService } from "./service";

let configuredService: AuthService | undefined;

/** 起動時にDBアダプターを注入する。リクエストごとの秘密値は保持しない。 */
export function configureAuthService(service: AuthService): void {
	configuredService = service;
}

export function getAuthService(): AuthService {
	if (!configuredService) {
		throw new Error("認証サービスが設定されていません");
	}
	return configuredService;
}
