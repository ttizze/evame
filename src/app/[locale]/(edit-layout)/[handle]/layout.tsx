import { NextIntlClientProvider } from "next-intl";
import { Suspense } from "react";

export default function EditLayout({
	params,
	children,
}: LayoutProps<"/[locale]/[handle]">): React.ReactNode {
	return (
		<Suspense fallback={null}>
			{params.then(({ locale }) => (
				<NextIntlClientProvider locale={locale}>
					{children}
				</NextIntlClientProvider>
			))}
		</Suspense>
	);
}
