import { fileURLToPath } from "node:url";

export const serverHtmlParser = {
	name: "server-html-parser",
	resolveId: {
		order: "pre" as const,
		handler(source: string) {
			if (source === "html-dom-parser")
				return fileURLToPath(
					import.meta.resolve("html-dom-parser/lib/server/html-to-dom"),
				);
		},
	},
};
