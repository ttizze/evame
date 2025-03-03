import type { LocaleOption } from "@/app/constants/locale";

export function buildLocaleOptions(
	sourceLocale: string,
	existLocales: string[],
	supportedLocaleOptions: LocaleOption[],
): LocaleOption[] {
	// Get info for the source locale.
	const sourceLocaleOption = supportedLocaleOptions.find(
		(sl) => sl.code === sourceLocale,
	) ?? { code: "und", name: "Unknown" };
	// For each existing locale, make an option
	const merged = [
		sourceLocaleOption,
		...existLocales.map((lc) => {
			const localeName =
				supportedLocaleOptions.find((sl) => sl.code === lc)?.name || lc;
			return { code: lc, name: localeName };
		}),
	];

	const existingOptions = merged.filter((option, index, self) => {
		return self.findIndex((o) => o.code === option.code) === index;
	});
	return existingOptions;
}
