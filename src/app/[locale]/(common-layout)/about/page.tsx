import type { Metadata } from "next";
import AboutSection from "@/app/[locale]/_components/about-section/server";

export const metadata: Metadata = {
	title: "Evame - About",
	description:
		"Evame is an open-source platform for collaborative article translation and sharing.",
};
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
	const locales = ["en", "ja", "zh", "ko", "es"];

	return locales.map((locale) => ({
		locale,
	}));
}
export default async function AboutPage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale } = await params;

	return <AboutSection locale={locale} topPage={false} />;
}
