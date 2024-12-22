import { franc } from "franc";
import { JSDOM } from "jsdom";

export async function getPageSourceLanguage(
	numberedContent: string,
	title: string,
): Promise<string> {
	const doc = new JSDOM(numberedContent);

	for (const el of doc.window.document.querySelectorAll("code, a")) {
		el.remove();
	}

	const textElements = [
		{
			number: 0,
			text: title,
		},
	];

	const elements = doc.window.document.querySelectorAll("[data-number]");

	for (const element of elements) {
		const dataNumber = element.getAttribute("data-number");
		if (dataNumber !== null) {
			textElements.push({
				number: Number(dataNumber),
				text: element.textContent?.trim() || "",
			});
		}
	}

	const sortedContent = textElements
		.sort((a, b) => a.number - b.number)
		.map((element) => element.text)
		.join("\n");
	const language = await franc(sortedContent);
	return language;
}
