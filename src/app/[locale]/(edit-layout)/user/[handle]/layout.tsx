import { NextIntlClientProvider } from "next-intl";

export default async function CommonLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return <NextIntlClientProvider>{children}</NextIntlClientProvider>;
}
