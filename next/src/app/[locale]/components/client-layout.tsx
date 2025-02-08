"use client";

import type { SanitizedUser } from "@/app/types";
import { Footer } from "./components/footer";
import { Header } from "./header";

interface ClientLayoutProps {
	children: React.ReactNode;
	isEditorPage: boolean;
	currentUser: SanitizedUser | null | undefined;
}

export function ClientLayout({
	children,
	isEditorPage,
	currentUser,
}: ClientLayoutProps) {
	return (
		<>
			{isEditorPage ? (
				children
			) : (
				<>
					<Header currentUser={currentUser} />
					<main className="mb-5 mt-3 md:mt-5 flex-grow tracking-wider">
						<div className="mx-auto px-2 max-w-4xl">{children}</div>
					</main>
					<Footer />
				</>
			)}
		</>
	);
}
