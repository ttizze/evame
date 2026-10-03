export function formatDate(date: Date, locale: string) {
	return date.toLocaleDateString(locale, { timeZone: "UTC" });
}
