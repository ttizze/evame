import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectEditSkeleton() {
	return (
		<div className="space-y-6">
			<div>
				<Skeleton className="h-8 w-64" />
				<Skeleton className="h-4 w-48 mt-2" />
			</div>

			<div className="space-y-8">
				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-4 w-48" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-32 w-full" />
					<Skeleton className="h-4 w-48" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-4 w-48" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-4 w-48" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-4 w-48" />
				</div>

				<div className="flex gap-4">
					<Skeleton className="h-10 w-32" />
					<Skeleton className="h-10 w-24" />
				</div>
			</div>
		</div>
	);
}
