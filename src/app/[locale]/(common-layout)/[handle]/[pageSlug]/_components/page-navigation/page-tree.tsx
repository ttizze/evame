import { ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function PageTree({
	hierarchy,
	locale,
	ownerHandle,
	slug,
	title,
}: {
	hierarchy: string[];
	locale: string;
	ownerHandle: string;
	slug: string;
	title: string;
}) {
	const currentIsInHierarchy = hierarchy.at(-1) === title;
	const ancestorLabels = currentIsInHierarchy
		? hierarchy.slice(0, -1)
		: hierarchy;

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					aria-label="page tree"
					className="flex items-center gap-2 rounded-full text-sm"
					title="page tree"
					variant="ghost"
				>
					<ListTree className="size-5" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-80 rounded-xl border border-border/70 bg-background p-4 shadow-lg dark:shadow-[0_9px_7px_rgba(255,255,255,0.1)]"
			>
				<nav aria-label="Page tree">
					<ol className="space-y-2 text-sm">
						{ancestorLabels.map((label, index) => (
							<li key={ancestorLabels.slice(0, index + 1).join("/")}>
								{index === ancestorLabels.length - 1 &&
								!currentIsInHierarchy ? (
									<span className="font-medium">{label}</span>
								) : (
									<a className="hover:underline" href={`/${locale}`}>
										{label}
									</a>
								)}
							</li>
						))}
						<li>
							<a
								className="hover:underline"
								href={`/${locale}/${ownerHandle}/${slug}`}
							>
								{title}
							</a>
						</li>
					</ol>
				</nav>
			</PopoverContent>
		</Popover>
	);
}
