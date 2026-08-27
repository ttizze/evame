import { Fragment } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function PageBreadcrumb({
	hierarchy,
	locale,
}: {
	hierarchy: string[];
	locale: string;
}) {
	if (hierarchy.length === 0) return null;

	return (
		<Breadcrumb className="not-prose">
			<BreadcrumbList>
				{hierarchy.map((label, index) => {
					const current = index === hierarchy.length - 1;
					return (
						<Fragment key={hierarchy.slice(0, index + 1).join("/")}>
							<BreadcrumbItem>
								{current ? (
									<BreadcrumbPage>{label}</BreadcrumbPage>
								) : (
									<BreadcrumbLink href={`/${locale}`}>{label}</BreadcrumbLink>
								)}
							</BreadcrumbItem>
							{!current && <BreadcrumbSeparator />}
						</Fragment>
					);
				})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}
