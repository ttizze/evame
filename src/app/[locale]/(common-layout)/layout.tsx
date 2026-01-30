import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Suspense } from "react";
import { ViewProvider } from "@/app/_context/view-provider";
import { Footer } from "@/app/[locale]/(common-layout)/_components/footer";
import { Header } from "@/app/[locale]/(common-layout)/_components/header/server";
import { TranslationFormOnClick } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-form-on-click.client";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";
import { Skeleton } from "@/components/ui/skeleton";

function LayoutSkeleton() {
	return (
		<div className="min-h-screen flex flex-col">
			<header className="h-14 border-b flex items-center justify-between px-4">
				<Skeleton className="h-8 w-20" />
				<Skeleton className="h-8 w-8 rounded-full" />
			</header>
			<main className="mb-5 mt-3 md:mt-5 grow">
				<div className="container mx-auto px-4 max-w-4xl">
					<Skeleton className="h-8 w-3/4 mb-4" />
					<Skeleton className="h-4 w-full mb-2" />
					<Skeleton className="h-4 w-5/6" />
				</div>
			</main>
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
						<ViewProvider>
							<Header />
							<main className="mb-5 mt-3 md:mt-5 grow tracking-wider">
								<div className="container mx-auto px-4 max-w-4xl">
									{children}
								</div>
							</main>
							<TranslationFormOnClick />
							<Footer />
						</ViewProvider>
					</NextIntlClientProvider>
				);
			})}
		</Suspense>
	);
}
