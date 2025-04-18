import { loadModule } from "cld3-asm";
import { JSDOM } from "jsdom";

export async function getLocaleFromHtml(
	htmlContent: string,
	title?: string,
	userLocale?: string,
): Promise<string> {
	const doc = new JSDOM(htmlContent);

	for (const el of doc.window.document.querySelectorAll("code, a")) {
		el.remove();
	}

	let textElements: { number: number; text: string }[] = [];
	if (title) {
		textElements = [
			{
				number: 0,
				text: title,
			},
		];
	}

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

	let cld = null;
	try {
		const cldFactory = await loadModule();
		cld = cldFactory.create();
		const result = await cld.findLanguage(sortedContent);
		const languageCode = result?.language || "und";
		if (languageCode === "und" && userLocale) {
			return userLocale;
		}
		return languageCode;
	} catch (error) {
		console.error("Error detecting language:", error);
		return userLocale || "und";
	} finally {
		if (cld) {
			cld.dispose();
		}
	}
}
