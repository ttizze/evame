import { cookies } from "next/headers";
import { FloatingControls } from "../floating-controls/floating-controls.client";
import { fetchSocialProofStats } from "./_db/social-proof-stats.server";
import AboutSectionPresentation from "./presentation";
import { fetchAboutPage } from "./service/fetch-about-page";

export default async function AboutSection({
	locale,
	topPage,
}: {
	locale: string;
	topPage: boolean;
}) {
	if (topPage) {
		const cookieStore = await cookies();
		const hasSession =
			cookieStore.has("better-auth.session_token") ||
			cookieStore.has("__Secure-better-auth.session_token");
		if (hasSession) {
			return <FloatingControls sourceLocale="mixed" userLocale={locale} />;
		}
	}

	const pageDetail = await fetchAboutPage(locale);
	const stats = await fetchSocialProofStats();

	return (
		<AboutSectionPresentation
			floatingControls={
				<FloatingControls sourceLocale="mixed" userLocale={locale} />
			}
			locale={locale}
			pageDetail={pageDetail}
			readControls={
				<FloatingControls
					alwaysVisible={true}
					position="w-full flex justify-center"
					sourceLocale={pageDetail.sourceLocale}
					userLocale={locale}
				/>
			}
			stats={stats}
		/>
	);
}
