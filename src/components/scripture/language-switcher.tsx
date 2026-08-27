type LanguageSwitcherProps = {
	locales: Array<{ code: string; label: string }>;
	currentLocale: string;
	hrefForLocale: (locale: string) => string;
};

export function LanguageSwitcher({
	locales,
	currentLocale,
	hrefForLocale,
}: LanguageSwitcherProps) {
	if (locales.length < 2) return null;

	return (
		<nav
			aria-label="表示言語"
			className="flex flex-wrap items-center gap-2 text-sm"
		>
			<span className="text-slate-500">Language</span>
			<ul className="flex flex-wrap items-center gap-1">
				{locales.map((locale) => {
					const isCurrent = locale.code === currentLocale;
					return (
						<li key={locale.code}>
							{isCurrent ? (
								<span
									aria-current="page"
									className="rounded-md bg-slate-900 px-2.5 py-1.5 font-medium text-white"
								>
									{locale.label}
								</span>
							) : (
								<a
									className="rounded-md px-2.5 py-1.5 text-slate-600 underline-offset-4 hover:bg-slate-100 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
									href={hrefForLocale(locale.code)}
								>
									{locale.label}
								</a>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
