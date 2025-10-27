import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { DOMParser } from "@xmldom/xmldom";
import { writeBookMarkdown } from "./convert-romn-to-md-nosplit/render";
import { getChildElements } from "./convert-romn-to-md-nosplit/tei";

const parser = new DOMParser();
const xml = `<body>
  <p rend="centre">中央寄せの行</p>
</body>`;
const document = parser.parseFromString(xml, "application/xml");
const body = document.getElementsByTagName("body").item(0);
const doc = {
	nodes: getChildElements(body),
	dirSegments: ["01-test"],
};
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nosplit-attr-"));
writeBookMarkdown(doc, tempDir, "out.md");
console.log(fs.readFileSync(path.join(tempDir, "01-test", "out.md"), "utf8"));
