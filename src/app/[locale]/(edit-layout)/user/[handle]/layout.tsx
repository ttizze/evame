import { NextIntlClientProvider } from "next-intl";

export default async function EditLayout(
	props: LayoutProps<"/[locale]/user/[handle]">,
) {
	const { locale } = await props.params;
	return (
		<NextIntlClientProvider locale={locale}>
			{props.children}
		</NextIntlClientProvider>
	);
}
