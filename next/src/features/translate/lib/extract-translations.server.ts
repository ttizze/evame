export function extractTranslations(
	text: string,
): { number: number; text: string }[] {
	try {
		const parsed = JSON.parse(text);
		if (Array.isArray(parsed)) {
			return parsed.map((item) => {
				return { number: item.number, text: item.text };
			});
		}
		throw new SyntaxError("Parsed JSON is not an array");
	} catch (error) {
		console.warn(
			"Failed to parse as JSON, falling back to regex parsing:",
			error,
		);
	}

	const translations: { number: number; text: string }[] = [];
	const regex =
		/{\s*"number"\s*:\s*(\d+)\s*,\s*"text"\s*:\s*"((?:\\.|[^"\\])*)"\s*}/g;
	let match = regex.exec(text);
	while (match !== null) {
		translations.push({
			number: Number.parseInt(match[1], 10),
			text: match[2],
		});
		match = regex.exec(text);
	}

	return translations;
}
