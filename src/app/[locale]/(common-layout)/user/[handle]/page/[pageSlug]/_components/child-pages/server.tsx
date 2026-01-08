import { fetchChildPagesTree } from "@/app/[locale]/_db/page-list.server";
import { SegmentElement } from "@/app/[locale]/(common-layout)/_components/wrap-segments/segment";
import type { PageForTree } from "@/app/[locale]/types";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface ChildPagesProps {
	parentId: number;
	locale: string;
}

type PageForTitleTree = PageForTree & { children: PageForTitleTree[] };

function PageLink({
	page,
	className,
}: {
	page: PageForTree;
	className?: string;
}) {
	const titleSegment = page.segments.find((s) => s.number === 0);
	if (!titleSegment) return null;

	const pageLink = `/user/${page.userHandle}/page/${page.slug}`;

	return (
		<Link className={cn("block overflow-hidden", className)} href={pageLink}>
			<SegmentElement
				className="line-clamp-1 break-all overflow-wrap-anywhere"
				interactive={false}
				segment={titleSegment}
				tagName="span"
			/>
		</Link>
	);
}

function ChildPageTree({ node }: { node: PageForTitleTree }) {
	const hasChildren = node.children.length > 0;

	if (!hasChildren) {
		return <PageLink page={node} />;
	}

	return (
		<details className="open:[&>summary>svg]:rotate-90 [&>summary>svg]:transition-transform [&>summary>svg]:duration-200 [&>summary>svg]:ease-in-out">
			<summary className="cursor-pointer list-none flex items-center gap-1">
				<svg
					aria-hidden="true"
					className="h-5 w-5"
					fill="none"
					stroke="currentColor"
					strokeWidth={2}
					viewBox="0 0 24 24"
				>
					<path d="M9 5l7 7-7 7" />
				</svg>
				<PageLink className="hover:underline" page={node} />
			</summary>
			<ul className="ml-4 space-y-1 list-none">
				{node.children.map((child) => (
					<li key={child.id}>
						<ChildPageTree node={child} />
					</li>
				))}
			</ul>
		</details>
	);
}

export async function ChildPages({ parentId, locale }: ChildPagesProps) {
	const children = await fetchChildPagesTree(parentId, locale);

	if (!children || children.length === 0) {
		return null;
	}

	return (
		<div>
			<ul className="space-y-1 list-none p-0">
				{children.map((child) => (
					<li key={child.id}>
						<ChildPageTree node={child} />
					</li>
				))}
			</ul>
		</div>
	);
}
