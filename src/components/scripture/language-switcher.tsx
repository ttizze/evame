import { Button } from "@/components/ui/button";
import { getScriptureCopy } from "./copy";

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
	const labels = getScriptureCopy(currentLocale);

	return (
		<nav
			aria-label={labels.languageNavigation}
			className="flex flex-wrap items-center gap-2 text-sm"
		>
			<span className="text-muted-foreground">{labels.language}</span>
			<ul className="flex flex-wrap items-center gap-1">
				{locales.map((locale) => {
					const isCurrent = locale.code === currentLocale;
					return (
						<li key={locale.code}>
							{isCurrent ? (
								<Button asChild size="sm" variant="default">
									<span aria-current="page">{locale.label}</span>
								</Button>
							) : (
								<Button asChild size="sm" variant="ghost">
									<a href={hrefForLocale(locale.code)}>{locale.label}</a>
								</Button>
							)}
						</li>
					);
				})}
			</ul>
		</nav>
	);
}
