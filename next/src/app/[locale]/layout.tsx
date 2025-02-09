"use client";
import { useSelectedLayoutSegments } from "next/navigation";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
export default function LocaleLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const segments = useSelectedLayoutSegments();
	const isEditorPage = segments.includes("edit");

	return (
		<>
			{isEditorPage ? (
				children
			) : (
				<>
					<Header />
					<main className="mb-5 mt-3 md:mt-5 flex-grow tracking-wider">
						<div className="mx-auto px-2 max-w-4xl">{children}</div>
					</main>
					<Footer />
				</>
			)}
		</>
	);
}
