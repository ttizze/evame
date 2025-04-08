import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectDetailSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-0">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
					<Skeleton className="h-8 w-2/3" />
					<div className="flex gap-2">
						<Skeleton className="h-6 w-16" />
						<Skeleton className="h-6 w-16" />
						<Skeleton className="h-6 w-16" />
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-6 pt-6">
				<Skeleton className="aspect-video w-full rounded-lg" />

				<div className="space-y-2">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-5/6" />
				</div>

				<div className="space-y-2">
					<Skeleton className="h-6 w-24" />
					<div className="flex gap-2">
						<Skeleton className="h-9 w-24" />
						<Skeleton className="h-9 w-24" />
					</div>
				</div>

				<div className="flex justify-between items-center pt-4 border-t">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-4 w-24" />
				</div>
			</CardContent>
		</Card>
	);
}
