import type { ReactNode } from "react";
import { Footer } from "./_components/footer";
import { Header } from "./_components/header/server";

export function CommonLayout({
	children,
	locale = "en",
}: {
	children: ReactNode;
	locale?: string;
}) {
	return (
		<div className="contents">
			<Header locale={locale} />
			<main className="mb-5 mt-3 grow tracking-wider md:mt-5">
				<div className="container mx-auto px-4 max-w-4xl">{children}</div>
			</main>
			<Footer locale={locale} />
		</div>
	);
}
