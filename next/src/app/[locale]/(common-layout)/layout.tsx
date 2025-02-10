import { Footer } from "@/app/[locale]/components/footer";
import { Header } from "@/app/[locale]/components/header";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";

export default async function CommonLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const messages = await getMessages();
	return (
		<>
			<Header />
			<NextIntlClientProvider messages={messages}>
				<main className="mb-5 mt-3 md:mt-5 flex-grow tracking-wider">
					<div className="mx-auto px-2 max-w-4xl">{children}</div>
				</main>
			</NextIntlClientProvider>
			<Footer />
		</>
	);
}
