import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

for (const name of [
	"indent-increase",
	"indent-decrease",
	"heading-2",
	"heading-3",
	"heading-4",
	"bold",
	"italic",
	"strikethrough",
	"code",
	"list",
	"list-ordered",
	"image",
	"quote",
	"square-code",
	"link",
	"type",
	"list-todo",
]) {
	const sourceName = name.startsWith("indent-") ? `list-${name}` : name;
	const { __iconData } = await import(
		pathToFileURL(
			resolve(`node_modules/lucide-react/dist/esm/icons/${sourceName}.mjs`),
		)
	);
	const elements = __iconData.node
		.map(
			([tag, attributes]) =>
				`<${tag} ${Object.entries(attributes)
					.filter(([key]) => key !== "key")
					.map(
						([key, value]) =>
							`${key}="${String(value).replaceAll('"', "&quot;")}"`,
					)
					.join(" ")}/>`,
		)
		.join("");
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${elements}</svg>`;
	const path = `apps/ios/App/Assets.xcassets/editor-${name}.imageset`;
	mkdirSync(path, { recursive: true });
	writeFileSync(
		`${path}/icon.pdf`,
		execFileSync(
			"rsvg-convert",
			["--format", "pdf", "--dpi-x", "72", "--dpi-y", "72"],
			{ input: svg },
		),
	);
	writeFileSync(
		`${path}/Contents.json`,
		`${JSON.stringify({ images: [{ filename: "icon.pdf", idiom: "universal" }], info: { author: "xcode", version: 1 }, properties: { "preserves-vector-representation": true, "template-rendering-intent": "template" } }, null, 2)}\n`,
	);
}
mkdirSync("apps/ios/App/Resources", { recursive: true });
copyFileSync(
	"node_modules/lucide-react/LICENSE",
	"apps/ios/App/Resources/Lucide-LICENSE.txt",
);
