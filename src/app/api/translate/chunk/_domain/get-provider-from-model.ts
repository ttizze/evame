type TranslationProvider = "gemini" | "vertex" | "openai" | "deepseek";

export function getProviderFromModel(
	aiModel: string,
	userPlan?: string,
): TranslationProvider {
	if (aiModel.startsWith("gpt-")) {
		return "openai";
	}
	if (aiModel.startsWith("deepseek-")) {
		return "deepseek";
	}
	if (aiModel.startsWith("gemini-")) {
		return "vertex";
	}
	if (userPlan === "premium") {
		return "vertex";
	}
	return "gemini";
}
