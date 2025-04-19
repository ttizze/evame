"use client";

import { useLocale } from "next-intl"; // または使用している国際化ライブラリ

interface ClientDateFormatterProps {
	date: Date;
}

export function ClientDateFormatter({ date }: ClientDateFormatterProps) {
	const locale = useLocale();
	return (
		<time dateTime={date.toISOString()}>{date.toLocaleDateString(locale)}</time>
	);
}
