import cld from "cld";
import { JSDOM } from "jsdom";

export async function getPageSourceLanguage(
	htmlContent: string,
	title: string,
): Promise<string> {
	const doc = new JSDOM(htmlContent);

	for (const el of doc.window.document.querySelectorAll("code, a")) {
		el.remove();
	}

	const textElements = [
		{
			number: 0,
			text: title,
		},
	];

	const elements = doc.window.document.querySelectorAll(
		"p, h1, h2, h3, h4, h5, h6, li, td, th",
	);

	for (const [index, element] of elements.entries()) {
		textElements.push({
			number: index + 1,
			text: element.textContent?.trim() || "",
		});
	}

	const sortedContent = textElements
		.sort((a, b) => a.number - b.number)
		.map((element) => element.text)
		.join("\n");
		
	try {
		const { detect } = cld;
		const result = await detect(sortedContent);
		return result.languages[0]?.code || "und";
	} catch (error) {
		console.error("Error detecting language:", error);
		return "und";
	}
}
