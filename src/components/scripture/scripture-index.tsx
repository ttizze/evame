import { Button } from "@/components/ui/button";
import { getScriptureCopy } from "./copy";
import { LanguageSwitcher } from "./language-switcher";
import type { ScriptureListItem } from "./types";

type ScriptureIndexProps = {
	items: ScriptureListItem[];
	locale?: string;
	availableLocales?: Array<{ code: string; label: string }>;
};

export function ScriptureIndex({
	items,
	locale = "ja",
	availableLocales = [],
}: ScriptureIndexProps) {
	const labels = getScriptureCopy(locale);

	return (
		<section
			aria-labelledby="scripture-index-title"
			className="mx-auto w-full max-w-4xl pb-16"
		>
			<header className="mb-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<p className="text-sm font-medium text-muted-foreground">
						{labels.brand}
					</p>
					<LanguageSwitcher
						currentLocale={locale}
						hrefForLocale={(nextLocale) => `/${nextLocale}`}
						locales={availableLocales}
					/>
				</div>
				<h1
					className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl"
					id="scripture-index-title"
				>
					{labels.title}
				</h1>
				<p className="mt-2 max-w-2xl text-base text-muted-foreground">
					{labels.intro}
				</p>
			</header>

			<p className="mb-4 text-sm text-muted-foreground">{labels.catalog}</p>

			{items.length === 0 ? (
				<div
					className="border-y border-dashed px-6 py-12 text-center text-muted-foreground"
					role="status"
				>
					{labels.empty}
				</div>
			) : (
				<ul aria-label={labels.scriptureList}>
					{items.map((item, index) => (
						<li key={item.id}>
							<article className="grid gap-4 border-b py-4 last:border-b-0 sm:grid-cols-[max-content_1fr]">
								<span className="text-lg font-medium text-muted-foreground">
									{index + 1}
								</span>
								<div className="grid min-w-0 gap-1">
									<a
										className="block truncate text-lg font-semibold hover:underline"
										href={item.href}
									>
										<h2>{item.title}</h2>
									</a>
									<p className="text-sm text-muted-foreground">
										{item.hierarchy.join(" / ")}
									</p>
									{item.paliTitle ? (
										<p className="text-sm text-muted-foreground" lang="pi">
											{item.paliTitle}
										</p>
									) : null}
									{item.description ? (
										<p className="mt-2 text-sm text-muted-foreground">
											{item.description}
										</p>
									) : null}
									<div className="mt-2 flex flex-wrap items-center gap-3">
										<span className="text-sm text-muted-foreground">
											{labels.translationCount(item.translationCount)}
										</span>
										<Button asChild className="h-auto px-0 py-0" variant="link">
											<a href={item.href}>{labels.read}</a>
										</Button>
									</div>
								</div>
							</article>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
