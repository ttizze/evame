import { Fragment } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getScriptureCopy } from "./copy";
import type { ScriptureBreadcrumbItem } from "./types";

type ScriptureBreadcrumbsProps = {
	items: ScriptureBreadcrumbItem[];
	locale?: string;
};

export function ScriptureBreadcrumbs({
	items,
	locale = "ja",
}: ScriptureBreadcrumbsProps) {
	if (items.length === 0) {
		return null;
	}
	const labels = getScriptureCopy(locale);

	return (
		<Breadcrumb
			aria-label={labels.scriptureHierarchy}
			className="mb-6 overflow-x-auto"
		>
			<BreadcrumbList className="min-w-max">
				{items.map((item, index) => {
					const isCurrent = item.current ?? index === items.length - 1;

					return (
						<Fragment
							key={`${item.href ?? item.label}-${item.current ? "current" : "ancestor"}`}
						>
							<BreadcrumbItem>
								{isCurrent || !item.href ? (
									<BreadcrumbPage>{item.label}</BreadcrumbPage>
								) : (
									<BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
								)}
							</BreadcrumbItem>
							{index < items.length - 1 ? <BreadcrumbSeparator /> : null}
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
