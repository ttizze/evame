import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Suspense } from "react";
import { Footer } from "@/app/[locale]/(common-layout)/_components/footer";
import { Header } from "@/app/[locale]/(common-layout)/_components/header/server";
import { ViewScope } from "@/app/[locale]/(common-layout)/_components/view-scope.client";
import { TranslationFormOnClick } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-form-on-click.client";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";

function LayoutSkeleton() {
	return (
		<div aria-hidden="true">
			<svg
				focusable="false"
				height="640"
				preserveAspectRatio="xMinYMin meet"
				viewBox="0 0 360 640"
				width="100%"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Loading layout</title>
				<rect
					fill="rgba(15, 23, 42, 0.12)"
					height="1"
					width="360"
					x="0"
					y="56"
				/>
				<rect
					fill="rgba(15, 23, 42, 0.08)"
					height="32"
					rx="8"
					width="80"
					x="16"
					y="12"
				/>
				<circle cx="328" cy="28" fill="rgba(15, 23, 42, 0.08)" r="16" />

				<rect
					fill="rgba(15, 23, 42, 0.08)"
					height="28"
					rx="6"
					width="240"
					x="16"
					y="88"
				/>
				<rect
					fill="rgba(15, 23, 42, 0.08)"
					height="14"
					rx="6"
					width="328"
					x="16"
					y="132"
				/>
				<rect
					fill="rgba(15, 23, 42, 0.08)"
					height="14"
					rx="6"
					width="276"
					x="16"
					y="154"
				/>
			</svg>
		</div>
	);
}

export default function CommonLayout({
	params,
	children,
}: LayoutProps<"/[locale]">) {
	return (
		<Suspense fallback={<LayoutSkeleton />}>
			{params.then(async ({ locale }) => {
				const messages = await getMessages();
				return (
					<NextIntlClientProvider locale={locale} messages={messages}>
						<OrganizationJsonLd />
						<WebSiteJsonLd locale={locale} />
						<ViewScope>
							<Header />
							<main className="mb-5 mt-3 md:mt-5 grow tracking-wider">
								<div className="container mx-auto px-4 max-w-4xl">
									{children}
								</div>
							</main>
							<TranslationFormOnClick />
							<Footer />
						</ViewScope>
					</NextIntlClientProvider>
				);
			})}
		</Suspense>
	);
}
