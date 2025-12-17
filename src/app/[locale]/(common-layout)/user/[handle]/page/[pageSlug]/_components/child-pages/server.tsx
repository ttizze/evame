import { fetchChildPages } from "@/app/[locale]/_db/page-list.server";
import { ChildPageTree } from "./client";

interface ChildPagesProps {
	parentId: number;
	locale: string;
}

export async function ChildPages({ parentId, locale }: ChildPagesProps) {
	const children = await fetchChildPages(parentId, locale);

	if (!children || children.length === 0) {
		return null;
	}

	return (
		<div>
			<ul className="space-y-1 list-none p-0">
				{children.map((child) => (
					<li key={child.id}>
						<ChildPageTree locale={locale} parent={child} />
					</li>
				))}
			</ul>
		</div>
	);
}
