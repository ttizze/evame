import { Footer } from "@/app/[locale]/components/footer";
import { Header } from "@/app/[locale]/components/header";
export default function LocaleLayout({
	children,
}: {
	children: React.ReactNode;
}) {


	return (
		<>
			<Header />
			<main className="mb-5 mt-3 md:mt-5 flex-grow tracking-wider">
				<div className="mx-auto px-2 max-w-4xl">{children}</div>
			</main>
			<Footer />
		</>
	);
}
