import { handleProjectAutoTranslation } from "@/app/[locale]/_lib/handle-auto-translation";
export async function triggerAutoTranslationIfNeeded(
	projectId: string,
	sourceLocale: string,
	currentUserId: string,
) {
	const geminiApiKey = process.env.GEMINI_API_KEY;
	if (!geminiApiKey || geminiApiKey === "undefined") {
		console.error("Gemini API key is not set. Page will not be translated.");
		return "Gemini API key is not set. Page will not be translated.";
	}
	handleProjectAutoTranslation({
		currentUserId,
		projectId,
		sourceLocale,
		geminiApiKey,
	});
	return "Started translation.";
}
