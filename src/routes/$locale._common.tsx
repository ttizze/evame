import { ClientOnly, createFileRoute, Outlet } from "@tanstack/react-router";
import { Footer } from "@/app/[locale]/(common-layout)/_components/footer";
import { HeaderFrame } from "@/app/[locale]/(common-layout)/_components/header";
import { HeaderUserSlot } from "@/app/[locale]/(common-layout)/_components/header/user-slot.client";
import { ViewScope } from "@/app/[locale]/(common-layout)/_components/view-scope";
import { TranslationFormOnClick } from "@/app/[locale]/(common-layout)/[handle]/[pageSlug]/_components/translation-form-on-click.client";
import { OrganizationJsonLd, WebSiteJsonLd } from "@/components/seo/json-ld";

export const Route = createFileRoute("/$locale/_common")({
	component: CommonLayout,
});

function CommonLayout() {
	const { locale } = Route.useParams();

	return (
		<>
			<OrganizationJsonLd />
			<WebSiteJsonLd locale={locale} />
			<ViewScope>
				<HeaderFrame
					locale={locale}
					userSlot={
						<ClientOnly fallback={null}>
							<HeaderUserSlot locale={locale} />
						</ClientOnly>
					}
				/>
				<main className="mb-5 mt-3 md:mt-5 grow tracking-wider">
					<div className="container mx-auto px-4 max-w-4xl">
						<Outlet />
					</div>
				</main>
				<ClientOnly fallback={null}>
					<TranslationFormOnClick />
				</ClientOnly>
				<Footer />
			</ViewScope>
		</>
	);
}
