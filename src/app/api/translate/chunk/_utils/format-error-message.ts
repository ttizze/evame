/**
 * Format error message for user-friendly display
 * Sanitizes error messages to avoid exposing sensitive information
 */
export function formatErrorMessage(error: unknown): string {
	if (!(error instanceof Error)) {
		return "Translation failed. Please try again later.";
	}

	const message = error.message;
	const status = (error as { status?: number }).status;

	// 429 error (rate limit)
	if (status === 429 || message.includes("429") || message.includes("quota")) {
		if (message.includes("free_tier")) {
			return "Free tier quota exceeded. Please wait and try again later.";
		}
		return "API rate limit exceeded. Please wait and try again later.";
	}

	// API key related errors
	if (
		message.includes("API key") ||
		message.includes("apiKey") ||
		message.includes("not set")
	) {
		return "API key is not configured. Please check your settings.";
	}

	// Network/timeout errors
	if (
		message.includes("timeout") ||
		message.includes("network") ||
		message.includes("ECONNREFUSED") ||
		message.includes("ENOTFOUND")
	) {
		return "Network error occurred. Please check your connection and try again.";
	}

	// Authentication/authorization errors
	if (status === 401 || status === 403 || message.includes("unauthorized")) {
		return "Authentication failed. Please check your API key.";
	}

	// Server errors (5xx)
	if (status && status >= 500) {
		return "Server error occurred. Please try again later.";
	}

	// For unknown errors, return a generic message
	// Never expose raw error messages to users
	return "Translation failed. Please try again later.";
}
