import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";
import { getCurrentUser } from "@/app/_service/auth-server";
import { FloatingControls } from "@/app/[locale]/(common-layout)/_components/floating-controls/floating-controls.client";
import { fetchUserByHandle } from "./_db/queries";
import { fetchProfilePage } from "./_service/profile";
import { getProfileMetadata } from "./metadata";
import { ProfilePagePresentation } from "./presentation";

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; handle: string }>;
}): Promise<Metadata> {
	const { locale, handle } = await params;
	if (!handle) {
		return notFound();
	}

	const pageOwner = await fetchUserByHandle(handle);
	if (!pageOwner) {
		return notFound();
	}

	const { title, description, image, alternates } = getProfileMetadata(
		locale,
		pageOwner,
	);
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: "profile",
			images: image ? [{ url: image }] : undefined,
		},
		twitter: { title, description },
		alternates,
	};
}

const searchParamsSchema = {
	page: parseAsInteger.withDefault(1),
	query: parseAsString.withDefault(""),
	tab: parseAsString.withDefault("home"),
	sort: parseAsString.withDefault("popular"),
};
const loadSearchParams = createLoader(searchParamsSchema);

export default async function UserPage(
	props: PageProps<"/[locale]/[handle]">,
): Promise<React.ReactNode> {
	const { handle, locale } = await props.params;
	const { sort, page } = await loadSearchParams(props.searchParams);
	const currentUser = await getCurrentUser();
	const data = await fetchProfilePage({
		currentUser: currentUser
			? { handle: currentUser.handle, id: currentUser.id }
			: null,
		handle,
		locale,
		page,
		sort: sort === "new" ? "new" : "popular",
	});

	if (!data) {
		return notFound();
	}

	return (
		<ProfilePagePresentation
			floatingControls={
				<FloatingControls sourceLocale="mixed" userLocale={locale} />
			}
			data={data}
			locale={locale}
			page={page}
			sort={sort === "new" ? "new" : "popular"}
		/>
	);
}
