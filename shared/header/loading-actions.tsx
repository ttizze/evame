import { Skeleton } from "@/components/ui/skeleton";
import { HeaderSearchLink } from "./search-link";

export function HeaderLoadingActions({ locale }: { locale: string }) {
	return (
		<div className="flex items-center gap-4">
			<HeaderSearchLink locale={locale} />
			<div className="flex items-center gap-3">
				<Skeleton className="h-6 w-6 md:w-[150px] rounded-full" />
				<Skeleton className="h-6 w-6 md:w-20 rounded-full" />
			</div>
		</div>
	);
}
