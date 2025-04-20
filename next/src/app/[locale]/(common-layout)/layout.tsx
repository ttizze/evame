import { Footer } from "@/app/[locale]/_components/footer";
import { DisplayProvider } from "@/app/[locale]/_lib/display-provider";
import { UserPrefProvider } from "@/app/_providers/user-pref-provider";
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
				<UserPrefProvider>
					<DisplayProvider userLocale={locale} sourceLocale="mixed">
						<Header />
						<main className="mb-5 mt-3 md:mt-5 flex-grow tracking-wider">
							<div className="container mx-auto px-4 max-w-4xl">{children}</div>
						</main>
						<Footer />
					</DisplayProvider>
				</UserPrefProvider>
			</NextIntlClientProvider>
		</>
	);
}
