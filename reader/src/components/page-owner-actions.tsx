import { useHydrated } from "@/app/_hooks/use-hydrated";
import { callReaderAction } from "@/app/_service/reader-action";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { PageActionsDropdown } from "@/app/[locale]/(common-layout)/_components/page/page-actions-dropdown/client";
import type { PageStatus } from "@/db/types";

export function PageOwnerActionsIsland({
	locale,
	handle,
	pageId,
	slug,
	status,
}: {
	locale: string;
	handle: string;
	pageId: number;
	slug: string;
	status: PageStatus;
}) {
	const hydrated = useHydrated();
	const { data: session } = authClient.useSession();
	if (!hydrated || session?.user.handle !== handle) return null;
	return (
		<PageActionsDropdown
			archive={() =>
				callReaderAction("pageStatus", { pageId, locale, operation: "archive" })
			}
			handle={handle}
			locale={locale}
			onUpdated={() => window.location.reload()}
			pageSlug={slug}
			publish={() =>
				callReaderAction("pageStatus", {
					locale,
					pageId,
					operation: "togglePublish",
				})
			}
			status={status}
		/>
	);
}
