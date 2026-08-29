import type { ReactNode } from "react";
import { SortTabs } from "./_components/sort-tabs";
import { UserInfo } from "./_components/user-info";
import { UserPageList } from "./_components/user-page-list";
import type { ProfilePageData } from "./_service/profile";

export function ProfilePagePresentation({
	data,
	floatingControls,
	locale,
	page,
	sort,
}: {
	data: ProfilePageData;
	floatingControls: ReactNode;
	locale: string;
	page: number;
	sort: "popular" | "new";
}) {
	return (
		<>
			<UserInfo data={data} locale={locale} />
			<SortTabs defaultSort={sort} />
			<UserPageList
				isOwner={data.isOwner}
				locale={locale}
				page={page}
				pageForLists={data.pageForLists}
				totalPages={data.totalPages}
			/>
			{floatingControls}
		</>
	);
}
