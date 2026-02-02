import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Suspense } from "react";

export default function EditLayout({
	params,
	children,
}: LayoutProps<"/[locale]/[handle]">): React.ReactNode {
	return (
		<Suspense fallback={null}>
			{params.then(async ({ locale }) => {
				const messages = await getMessages();
				return (
					<NextIntlClientProvider locale={locale} messages={messages}>
						{children}
					</NextIntlClientProvider>
				);
			})}
		</Suspense>
	);
}
