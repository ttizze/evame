import { Footer } from "@/app/[locale]/_components/footer";
import { DisplayProvider } from "@/app/_context/display-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import dynamic from "next/dynamic";

const Header = dynamic(
	() => import("@/app/[locale]/_components/header").then((mod) => mod.Header),
	{
		loading: () => <Skeleton className="h-10 w-full" />,
	},
);

export default async function CommonLayout({
	params,
	children,
}: {
	params: Promise<{ locale: string }>;
	children: React.ReactNode;
}) {
	const messages = await getMessages();
	const { locale } = await params;

	return (
		<>
			<NextIntlClientProvider messages={messages}>
				<DisplayProvider userLocale={locale} initialSourceLocale="mixed">
					<Header />
					<main className="mb-5 mt-3 md:mt-5 grow tracking-wider">
						<div className="container mx-auto px-4 max-w-4xl">{children}</div>
					</main>
					<Footer />
				</DisplayProvider>
			</NextIntlClientProvider>
		</>
	);
}
