import type { LucideIcon } from "lucide-react";

interface ProjectListContainerProps {
	title: string;
	icon: LucideIcon;
	children: React.ReactNode;
	showPagination?: boolean;
}

export function ProjectListContainer({
	title,
	icon: Icon,
	children,
	showPagination = false,
}: ProjectListContainerProps) {
	return (
		<div className="flex flex-col gap-4">
			<h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
				<Icon className="w-4 h-4" />
				{title}
			</h2>
			{children}
		</div>
	);
}
