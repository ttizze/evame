import { Footer } from "@/app/[locale]/components/footer";
import dynamic from "next/dynamic";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

const Header = dynamic(
	() => import("@/app/[locale]/components/header").then((mod) => mod.Header),
	{
		loading: () => <div>Loading...</div>,
	},
);

export default async function CommonLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const messages = await getMessages();
	return (
		<>
			<NextIntlClientProvider messages={messages}>
				<Header />
				<main className="mb-5 mt-3 md:mt-5 flex-grow tracking-wider">
					<div className="mx-auto px-2 max-w-4xl">{children}</div>
				</main>
				<Footer />
			</NextIntlClientProvider>
		</>
	);
}
