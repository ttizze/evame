export function canTranslateWithoutGeminiApiKey(
	hasGeminiApiKey: boolean,
	selectedModel: string,
) {
	return hasGeminiApiKey || !selectedModel.startsWith("gemini-");
}
