import { LanguageSwitcher } from "./language-switcher";
import type { ScriptureListItem } from "./types";

type ScriptureIndexProps = {
	items: ScriptureListItem[];
	locale?: string;
	availableLocales?: Array<{ code: string; label: string }>;
};

const copy = {
	ja: {
		brand: "デジタル仏教",
		title: "パーリ語仏典を読む",
		intro:
			"パーリ語の原文と、選択した言語の訳文を並べて読み、ことばの意味を静かに確かめられます。",
		catalog:
			"公開されている仏典を収録しています。題名を選ぶと、原文と翻訳候補を表示します。",
		translationCount: (count: number) => `翻訳 ${count}候補`,
		read: "読む",
		empty: "公開されている仏典はまだありません。",
	},
	en: {
		brand: "Digital Buddhism",
		title: "Read the Pāli canon",
		intro:
			"Read the Pāli source alongside translations in your chosen language and examine each passage at your own pace.",
		catalog:
			"Browse the published canon. Select a text to compare its source and translation candidates.",
		translationCount: (count: number) =>
			`${count} translation${count === 1 ? "" : "s"}`,
		read: "Read text",
		empty: "No published scriptures are available yet.",
	},
} as const;

function getCopy(locale: string) {
	return locale.toLowerCase().startsWith("ja") ? copy.ja : copy.en;
}

export function ScriptureIndex({
	items,
	locale = "ja",
	availableLocales = [],
}: ScriptureIndexProps) {
	const labels = getCopy(locale);

	return (
		<section
			aria-labelledby="scripture-index-title"
			className="mx-auto max-w-5xl pb-16 text-slate-900"
		>
			<header className="mb-10 border-b border-slate-200 pb-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="mb-3 text-sm font-semibold tracking-[0.2em] text-slate-500">
						{labels.brand}
					</p>
					<LanguageSwitcher
						currentLocale={locale}
						hrefForLocale={(nextLocale) => `/${nextLocale}`}
						locales={availableLocales}
					/>
				</div>
				<h1
					className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl"
					id="scripture-index-title"
				>
					{labels.title}
				</h1>
				<p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
					{labels.intro}
				</p>
			</header>

			<div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
				<p className="text-sm leading-7 text-slate-600">{labels.catalog}</p>
			</div>

			{items.length === 0 ? (
				<div
					className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-600"
					role="status"
				>
					{labels.empty}
				</div>
			) : (
				<ul aria-label="仏典一覧" className="grid gap-4 sm:grid-cols-2">
					{items.map((item) => (
						<li key={item.id}>
							<a
								className="group block h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_12px_rgba(15,23,42,0.04)] transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 sm:p-6"
								href={item.href}
							>
								<p className="mb-4 text-xs text-slate-500">
									{item.hierarchy.join(" / ")}
								</p>
								<div className="flex items-start justify-between gap-4">
									<div>
										<h2 className="text-xl font-semibold text-slate-950 group-hover:text-slate-700">
											{item.title}
										</h2>
										{item.paliTitle ? (
											<p className="mt-1 text-sm text-slate-500" lang="pi">
												{item.paliTitle}
											</p>
										) : null}
									</div>
									<span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
										{labels.translationCount(item.translationCount)}
									</span>
								</div>
								{item.description ? (
									<p className="mt-5 text-sm leading-7 text-slate-600">
										{item.description}
									</p>
								) : null}
								<span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
									{labels.read}
									<span
										aria-hidden="true"
										className="transition-transform group-hover:translate-x-1"
									>
										→
									</span>
								</span>
							</a>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
