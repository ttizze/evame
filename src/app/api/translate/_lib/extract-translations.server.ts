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
		if (match[1] && match[2]) {
			const number = Number.parseInt(match[1], 10);
			const raw = match[2];
			// Attempt to JSON-decode escape sequences (e.g. \n, \t, \" , \uXXXX)
			let decoded = raw;
			decoded = JSON.parse(`"${raw}"`);
			translations.push({ number, text: decoded });
		}
		match = regex.exec(text);
	}

	return translations;
}
