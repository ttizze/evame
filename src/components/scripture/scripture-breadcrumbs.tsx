import type { ScriptureBreadcrumbItem } from "./types";

type ScriptureBreadcrumbsProps = {
	items: ScriptureBreadcrumbItem[];
};

export function ScriptureBreadcrumbs({ items }: ScriptureBreadcrumbsProps) {
	if (items.length === 0) {
		return null;
	}

	return (
		<nav aria-label="仏典の階層" className="mb-6 overflow-x-auto">
			<ol className="flex min-w-max items-center gap-2 text-sm text-muted-foreground">
				{items.map((item, index) => {
					const isCurrent = item.current ?? index === items.length - 1;

					return (
						<li
							className="flex items-center gap-2"
							key={`${item.href ?? item.label}-${item.current ? "current" : "ancestor"}`}
						>
							{index > 0 ? (
								<span aria-hidden="true" className="text-slate-300">
									/
								</span>
							) : null}
							{isCurrent || !item.href ? (
								<span
									aria-current={isCurrent ? "page" : undefined}
									className={
										isCurrent ? "font-medium text-slate-900" : undefined
									}
								>
									{item.label}
								</span>
							) : (
								<a
									className="rounded-sm underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
									href={item.href}
								>
									{item.label}
								</a>
							)}
						</li>
					);
				})}
			</ol>
		</nav>
	);
}
