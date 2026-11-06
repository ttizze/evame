import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getPlatformProxy } from "wrangler";

// 初回切り替え前の準備だけに使う。HTMLは作らず、過去記事の一括生成を予約する。
const reader = JSON.parse(await readFile("reader/wrangler.jsonc", "utf8"));
const directory = await mkdtemp(join(tmpdir(), "evame-reader-initialize-"));
const configPath = join(directory, "wrangler.json");
await writeFile(
	configPath,
	JSON.stringify({
		name: "evame-reader-publisher",
		account_id: reader.account_id,
		compatibility_date: reader.compatibility_date,
		r2_buckets: [
			{
				binding: "READER_HTML",
				bucket_name: "evame-reader-html",
				remote: true,
			},
		],
	}),
);
let proxy;
try {
	proxy = await getPlatformProxy({ configPath, envFiles: [], persist: false });
	const locales = JSON.parse(
		execFileSync(
			"bun",
			[
				"-e",
				`
		import { supportedLocaleOptions } from "./src/app/_constants/locale";
		console.log(JSON.stringify(supportedLocaleOptions.map(({code}) => code)));
	`,
			],
			{ encoding: "utf8" },
		),
	);
	const missing = [];
	for (const locale of locales)
		if (!(await proxy.env.READER_HTML.head(`publication/${locale}.json`)))
			missing.push(locale);
	const missingSources = !(await proxy.env.READER_HTML.head(
		"publication/sources.json",
	));
	if (missing.length || missingSources) {
		const { catalogs, sourceState } = JSON.parse(
			execFileSync(
				"bun",
				[
					"-e",
					`
			import { fetchReaderCatalogSources } from "./src/app/api/reader-data/_db/queries";
			import { buildReaderDocuments } from "./src/app/api/reader-data/_domain/reader-documents";
			import { readerDocumentSourcePath } from "./src/app/_domain/reader-document";
			import { disposeDb } from "./src/db";
			try {
				const source = await fetchReaderCatalogSources();
				const catalogs = ${JSON.stringify(missing)}.map(locale => ({
					locale, revision: source.revision,
					documents: Object.fromEntries(Object.entries(buildReaderDocuments(source, locale)).map(([path, hash]) => [path, "pending:deployment:bootstrap:" + hash]))
				}));
				const sources = Object.fromEntries(Object.entries({ ...buildReaderDocuments(source, "ja"), ...buildReaderDocuments(source, "en") }).map(([path, hash]) => [readerDocumentSourcePath(path), { hash, revision: source.revision }]));
				console.log(JSON.stringify({ catalogs, sourceState: { revision: source.revision, sources } }));
			} finally { await disposeDb(); }
		`,
				],
				{ encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
			),
		);
		if (missingSources) {
			const saved = await proxy.env.READER_HTML.put(
				"publication/sources.json",
				JSON.stringify(sourceState),
				{
					onlyIf: new Headers({ "If-None-Match": "*" }),
					httpMetadata: { contentType: "application/json" },
				},
			);
			if (saved) console.log("全言語で共用する生成元の変更時期を初期化");
		}
		for (const { locale, revision, documents } of catalogs) {
			const saved = await proxy.env.READER_HTML.put(
				`publication/${locale}.json`,
				JSON.stringify({ revision, documents }),
				{
					onlyIf: new Headers({ "If-None-Match": "*" }),
					httpMetadata: { contentType: "application/json" },
				},
			);
			if (saved)
				console.log(
					`${locale}: ${Object.keys(documents).length}件の初回生成を予約`,
				);
		}
	}
} finally {
	await proxy?.dispose();
	await rm(directory, { recursive: true, force: true });
}
