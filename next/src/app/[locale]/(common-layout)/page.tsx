import { getCurrentUser } from "@/auth";

import type { Metadata } from "next";
import dynamic from "next/dynamic";
const PagesListTab = dynamic(() =>
	import("@/app/[locale]/components/pages-list-tab/index"),
);
const HeroSection = dynamic(() =>
	import("@/app/[locale]/components/hero-section/index"),
);
export const metadata: Metadata = {
	title: "Evame - Home - Latest Pages",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};

export default async function HomePage({
	params,
	searchParams,
}: {
	params: Promise<{ locale: string }>;
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const currentUser = await getCurrentUser();
	const { locale } = await params;

	return (
		<div className="flex flex-col justify-between">
			{!currentUser && <HeroSection locale={locale} />}
			<PagesListTab
				locale={locale}
				currentUserId={currentUser?.id ?? ""}
				searchParams={searchParams}
			/>
		</div>
	);
}
