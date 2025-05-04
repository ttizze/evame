import { fetchGeminiApiKeyByHandle } from "@/app/_db/queries.server";
import { TranslateActionSectionClient } from "./client";

type TranslateActionSectionProps = {
	currentHandle: string | undefined;
};

export async function TranslateActionSection({
	currentHandle,
}: TranslateActionSectionProps) {
	const geminiApiKey = await fetchGeminiApiKeyByHandle(currentHandle ?? "");
	const hasGeminiApiKey = !!geminiApiKey;
	return (
		<TranslateActionSectionClient
			currentHandle={currentHandle}
			hasGeminiApiKey={hasGeminiApiKey}
		/>
	);
}
