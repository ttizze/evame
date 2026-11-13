import type { ReactNode } from "react";
import { NewPageButton } from "./new-page-button";
import { HeaderSearchLink } from "./search-link";

export function HeaderAccountFrame({
	locale,
	handle,
	children,
}: {
	locale: string;
	handle: string;
	children: ReactNode;
}) {
	return (
		<div className="flex items-center gap-4">
			<HeaderSearchLink locale={locale} />
			<NewPageButton handle={handle} locale={locale} />
			{children}
		</div>
	);
}
