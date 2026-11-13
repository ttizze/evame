import { Search } from "lucide-react";

export function HeaderSearchLink({ locale }: { locale: string }) {
	return (
		<a aria-label="Search for pages" href={`/${locale}/search`}>
			<Search className="w-6 h-6 " />
		</a>
	);
}
