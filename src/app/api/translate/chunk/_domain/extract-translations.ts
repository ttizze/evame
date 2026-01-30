import { createServerLogger } from "@/app/_service/logger.server";
import type { TranslatedElement } from "../../types";

const logger = createServerLogger("extract-translations");

const parseJsonTranslations = (text: string): TranslatedElement[] | null => {
	const parsed = JSON.parse(text);
	if (!Array.isArray(parsed)) return null;
	const normalized = parsed.map((item) => {
		if (!item || typeof item !== "object") return null;
		const { number, text: translatedText } = item as {
			number?: unknown;
			text?: unknown;
		};
		if (typeof number !== "number" || typeof translatedText !== "string") {
			return null;
		}
		return { number, text: translatedText };
	});
	if (normalized.some((item) => item === null)) return null;
	return normalized as TranslatedElement[];
};

const decodeJsonString = (raw: string) => {
	try {
		return JSON.parse(`"${raw}"`) as string;
	} catch {
		return raw;
	}
};

export function extractTranslations(text: string): TranslatedElement[] {
	try {
		const parsed = parseJsonTranslations(text);
		if (parsed) return parsed;
		throw new SyntaxError("Parsed JSON is not a valid translation array");
	} catch (error) {
		logger.warn(
			{
				error_message: error instanceof Error ? error.message : String(error),
				input_length: text.length,
				input_preview: text.slice(0, 300),
				input_end: text.slice(-300),
			},
			"Failed to parse as JSON, falling back to regex parsing",
		);
	}

	const translations: TranslatedElement[] = [];
	const regex =
		/{\s*"number"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"\s*}/g;
	let match = regex.exec(text);
	while (match !== null) {
		const numberText = match[1];
		const raw = match[2];
		if (!numberText || raw === undefined) continue;
		const number = Number.parseInt(numberText, 10);
		const decoded = decodeJsonString(raw);
		translations.push({ number, text: decoded });
		match = regex.exec(text);
	}

	logger.debug(
		{ extracted_count: translations.length },
		"Regex fallback extraction completed",
	);

	return translations;
}
