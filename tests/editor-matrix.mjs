import { mkdir, writeFile } from "node:fs/promises";

// Expectations describe user operations in Markdown, independently of Lexical's
// tree and UIKit's rendering units. The same cases run against both boundaries.
const text = "甲乙丙";
export const blockSamples = [
	{
		name: "段落",
		type: "paragraph",
		template: "{text}",
		enter: ["\n\n追甲乙丙", "甲\n\n追乙丙", "甲乙丙\n\n追"],
		start: "{text}",
	},
	...[
		["見出し2", "h2", "##"],
		["見出し3", "h3", "###"],
		["見出し4", "h4", "####"],
	].map(([name, type, marker]) => ({
		name,
		type,
		template: `${marker} {text}`,
		enter: [
			`\n\n${marker} 追甲乙丙`,
			`${marker} 甲\n\n${marker} 追乙丙`,
			`${marker} 甲乙丙\n\n追`,
		],
		start: `${marker} {text}`,
	})),
	{
		name: "引用",
		type: "quote",
		template: "> {text}",
		enter: [">\n>\n> 追甲乙丙", "> 甲\n>\n> 追乙丙", "> 甲乙丙\n>\n> 追"],
		start: "{text}",
	},
	{
		name: "コード",
		type: "code",
		template: "```\n{text}\n```",
		enter: [
			"```\n\n追甲乙丙\n```",
			"```\n甲\n追乙丙\n```",
			"```\n甲乙丙\n追\n```",
		],
		start: "{text}",
	},
	{
		name: "箇条書き",
		type: "bullet",
		template: "- {text}",
		enter: ["- \n- 追甲乙丙", "- 甲\n- 追乙丙", "- 甲乙丙\n- 追"],
		start: "{text}",
	},
	{
		name: "番号付き",
		type: "number",
		template: "1. {text}",
		enter: ["1. \n2. 追甲乙丙", "1. 甲\n2. 追乙丙", "1. 甲乙丙\n2. 追"],
		start: "{text}",
	},
	{
		name: "チェック項目",
		type: "check",
		template: "- [ ] {text}",
		enter: [
			"- [ ] &#x20;\n- [ ] 追甲乙丙",
			"- [ ] 甲\n- [ ] 追乙丙",
			"- [ ] 甲乙丙\n- [ ] 追",
		],
		start: "{text}",
	},
	{
		name: "入れ子の引用",
		type: "nested-quote",
		template: "> > {text}",
		enter: [
			"> >\n> >\n> > 追甲乙丙",
			"> > 甲\n> >\n> > 追乙丙",
			"> > 甲乙丙\n> >\n> > 追",
		],
		start: "> {text}",
	},
	{
		name: "入れ子の箇条書き",
		type: "nested-bullet",
		template: "- 親\n  - {text}",
		unit: 1,
		enter: [
			"- 親\n  - \n  - 追甲乙丙",
			"- 親\n  - 甲\n  - 追乙丙",
			"- 親\n  - 甲乙丙\n  - 追",
		],
		start: "- 親{text}",
	},
	{
		name: "入れ子の番号付き",
		type: "nested-number",
		template: "1. 親\n\n   3. {text}",
		unit: 1,
		enter: [
			"1. 親\n\n   3. \n   4. 追甲乙丙",
			"1. 親\n\n   3. 甲\n   4. 追乙丙",
			"1. 親\n\n   3. 甲乙丙\n   4. 追",
		],
		start: "1. 親{text}",
	},
	{
		name: "完了したチェック項目",
		type: "checked",
		template: "- [x] {text}",
		enter: [
			"- [x] &#x20;\n- [ ] 追甲乙丙",
			"- [x] 甲\n- [ ] 追乙丙",
			"- [x] 甲乙丙\n- [ ] 追",
		],
		start: "{text}",
	},
];

export const blockInputs = {
	paragraph: "",
	h2: "## ",
	h3: "### ",
	h4: "#### ",
	quote: "> ",
	code: "```\n",
	bullet: "- ",
	number: "1. ",
	check: "- [ ] ",
};

export const projectionCases = [
	{
		name: "チェック項目の最初がコードの場合",
		markdown: "- [ ] &#x20;\n\n  ```\n  code\n  ```",
		text: ["code"],
	},
	{
		name: "1つのリスト項目に続く3段落",
		markdown: "- 前半\n\n  中間\n\n  後半",
		text: ["前半", "中間", "後半"],
	},
	{
		name: "リスト内のコードとその前後の段落",
		markdown: "- 前半\n\n  ```\n  code\n  ```\n\n  後半",
		text: ["前半", "code", "後半"],
	},
	{
		name: "リスト内の引用とその前後の段落",
		markdown: "- 前半\n\n  > 引用\n\n  後半",
		text: ["前半", "引用", "後半"],
	},
	{
		name: "入れ子のリストより後に続く同じ項目の段落",
		markdown: "* 前半\n  * 子\n\n  後半",
		text: ["前半", "子", "後半"],
	},
	{
		name: "チェック項目内のコードとその前後の段落",
		markdown: "- [ ] 前半\n\n  ```\n  code\n  ```\n\n  後半",
		text: ["前半", "code", "後半"],
	},
];

// 1つの項目内の段落境界でも、空行と入力位置を保持する。
export const paragraphEditCases = ["delete", "enter", "backspace"].flatMap(
	(action) =>
		[0, 1, 2].map((unit) => {
			const text = ["前半", "中間", "後半", "後の段落"];
			let caret = { unit, offset: 0 };
			if (action === "delete") text[unit] = "";
			if (action === "enter") {
				text.splice(unit + 1, 0, "");
				caret = { unit: unit + 1, offset: 0 };
			}
			if (action === "backspace" && unit > 0) {
				text.splice(unit - 1, 2, text[unit - 1] + text[unit]);
				caret = { unit: unit - 1, offset: 2 };
			}
			return {
				name: `${["先頭", "中間", "末尾"][unit]}の段落で${action}`,
				action,
				unit,
				text,
				caret,
			};
		}),
);

export const editingCases = [];
for (const [sampleIndex, sample] of blockSamples.entries()) {
	for (const origin of sampleIndex < 9
		? ["読み込み", "メニュー作成", "Markdown入力"]
		: ["読み込み"]) {
		const created = origin === "メニュー作成";
		const typed = origin === "Markdown入力";
		const setup = {
			source: typed
				? ""
				: created
					? text
					: sample.template.replace("{text}", text),
			input: typed ? blockInputs[sample.type] : null,
			create: created ? sample.type : null,
			unit: sample.unit ?? 0,
			empty: false,
		};
		for (const [positionIndex, offset] of [0, 1, 3].entries()) {
			const position = ["先頭", "途中", "末尾"][positionIndex];
			const name = `${sample.name}・${origin}・${position}`;
			editingCases.push({
				...setup,
				name: `${name}でReturn`,
				offset,
				action: "enter",
				argument: null,
				expected: sample.enter[positionIndex],
			});
			const remaining =
				offset === 0 ? text : text.slice(0, offset - 1) + text.slice(offset);
			editingCases.push({
				...setup,
				name: `${name}でBackspace`,
				offset,
				action: "backspace",
				argument: null,
				expected: (offset === 0 ? sample.start : sample.template).replace(
					"{text}",
					remaining,
				),
			});
		}
		if (sampleIndex >= 9) continue;
		for (const action of ["enter", "backspace"]) {
			editingCases.push({
				...setup,
				empty: true,
				source:
					created || typed
						? ""
						: sample.type === "check"
							? "- [ ] &#x20;"
							: sample.template.replace("{text}", ""),
				name: `${sample.name}・${origin}・空で${action === "enter" ? "Return" : "Backspace"}`,
				offset: 0,
				action,
				argument: null,
				expected:
					action !== "enter"
						? "追"
						: sample.type === "code"
							? "```\n\n追\n```"
							: /^h[234]$/.test(sample.type)
								? `${sample.template.replace("{text}", "")}\n\n追`
								: "追",
			});
		}
		for (const target of blockSamples.slice(0, 9)) {
			for (const [positionIndex, offset] of [0, 1, 3].entries()) {
				let expected = (
					(sample.type === target.type &&
						!["bullet", "number", "check"].includes(target.type)) ||
					target.type === "paragraph"
						? "{text}"
						: target.template
				).replace("{text}", text);
				if (
					sample.type === "quote" &&
					!["quote", "paragraph"].includes(target.type)
				)
					expected = expected
						.split("\n")
						.map((line) => `> ${line}`)
						.join("\n");
				editingCases.push({
					...setup,
					name: `${sample.name}・${origin}・${["先頭", "途中", "末尾"][positionIndex]}で${target.name}へ切り替え`,
					offset,
					action: "block",
					argument: target.type,
					expected,
				});
			}
		}
	}
}

for (const [action, argument, expected] of [
	["block", "number", "- 前半\n  1. 子\n\n  後半"],
	["block", "paragraph", "- 前半\n\n  子\n\n  後半"],
	["block", "h2", "- 前半\n\n  ## 子\n\n  後半"],
	["block", "quote", "- 前半\n\n  > 子\n\n  後半"],
	["block", "code", "- 前半\n\n  ```\n  子\n  ```\n\n  後半"],
	["outdent", null, "- 前半\n\n  後半\n\n- 子"],
	["backspace", null, "- 前半\n\n  後半\n\n- 子"],
])
	editingCases.push({
		name: `前後の親本文を持つ子リストの${action} ${argument ?? ""}`,
		source: "- 前半\n  - 子\n\n  後半",
		create: null,
		input: null,
		empty: false,
		unit: 1,
		offset: action === "backspace" ? 0 : 1,
		action,
		argument,
		expected,
	});

editingCases.push({
	name: "子リストから始まる親の次を段落にしても後続番号を保つ",
	source: "1. - 子\n\n   親本文\n2. 対象\n3. 後",
	create: null,
	input: null,
	empty: false,
	unit: 2,
	offset: 1,
	action: "block",
	argument: "paragraph",
	expected: "1. - 子\n\n   親本文\n\n対象\n\n3. 後",
});

editingCases.push({
	name: "親本文の先頭でBackspaceしても子リストと後ろの本文を保つ",
	source: "- 前半\n  - 子\n\n  後半",
	create: null,
	input: null,
	empty: false,
	unit: 0,
	offset: 0,
	action: "backspace",
	argument: null,
	expected: "前半\n\n- 子\n\n後半",
});

for (const [type, first, last] of [
	["paragraph", "前半", "後半"],
	["h2", "## 前半", "## 後半"],
	["quote", "> 前半", "> 後半"],
	["code", "```\n前半\n```", "```\n後半\n```"],
])
	for (const unit of [0, 2])
		editingCases.push({
			name: `子リストの${unit === 0 ? "前" : "後"}の親本文を${type}にしても子リストと順序を保つ`,
			source: "- 前半\n  - 子\n\n  後半",
			create: null,
			input: null,
			empty: false,
			unit,
			offset: 1,
			action: "block",
			argument: type,
			expected:
				unit === 0 ? `${first}\n\n- 子\n\n後半` : `前半\n\n- 子\n\n${last}`,
		});

if (import.meta.main) {
	const directory = new URL(
		"../apps/ios/.build/EditingFixtures/",
		import.meta.url,
	);
	await mkdir(directory, { recursive: true });
	await writeFile(
		new URL("matrix.json", directory),
		JSON.stringify(editingCases),
	);
	await writeFile(
		new URL("projection.json", directory),
		JSON.stringify(projectionCases),
	);
	await writeFile(
		new URL("paragraph-edits.json", directory),
		JSON.stringify(paragraphEditCases),
	);
	console.log(
		`EDITOR_MATRIX ${editingCases.length} cases, PROJECTION ${projectionCases.length} cases`,
	);
}
