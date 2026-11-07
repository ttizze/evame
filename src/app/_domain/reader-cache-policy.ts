export function shouldInvalidateReader(
	method: string,
	pathname: string,
	action: string | null,
	status: number,
	changed: string | null,
) {
	if (
		!["POST", "PUT", "PATCH", "DELETE"].includes(method) ||
		(status >= 400 && status < 500) ||
		changed === "false"
	)
		return false;
	if (pathname === "/api/reader-actions")
		return (
			action !== null &&
			!["like", "geminiKey", "uploadImage", "translate"].includes(action)
		);
	if (pathname === "/api/translate/chunk") return changed === "true";
	return (
		pathname.startsWith("/_serverFn/") ||
		[
			"/api/segment-translations",
			"/api/sync/push",
			"/api/auth/update-user",
			"/api/auth/delete-user",
		].includes(pathname)
	);
}
