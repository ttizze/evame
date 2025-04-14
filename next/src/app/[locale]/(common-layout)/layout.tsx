import { Footer } from "@/app/[locale]/_components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import dynamic from "next/dynamic";
import { FloatingControls } from "./user/[handle]/page/[slug]/_components/floating-controls";
const Header = dynamic(
	() => import("@/app/[locale]/_components/header").then((mod) => mod.Header),
	{
		loading: () => <Skeleton className="h-10 w-full" />,
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
				<FloatingControls shareTitle="evame" />
				<Footer />
			</NextIntlClientProvider>
		</>
	);
}
