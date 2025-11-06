import { loadModule } from "cld3-asm";
import { JSDOM } from "jsdom";

export async function getLocaleFromHtml(
	htmlContent: string,
	userLocale: string,
): Promise<string> {
	const doc = new JSDOM(htmlContent);

	for (const el of doc.window.document.querySelectorAll("code, a")) {
		el.remove();
	}

	const contents = [
		...doc.window.document.querySelectorAll("p,h1,h2,h3,h4,h5,h6,li,td,th"),
	]
		.map((el) => el.textContent?.trim() ?? "")
		.filter(Boolean)
		.join("\n");

	let cld = null;
	try {
		cld = (await loadModule()).create();
		const { language = "und" } = cld.findLanguage(contents);
		return language !== "und" ? language : userLocale;
	} catch (e) {
		console.error("Language detect error:", e);
		return userLocale;
	} finally {
		cld?.dispose(); // ← 生成されていれば必ず解放
	}
}
