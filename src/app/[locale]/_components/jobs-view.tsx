import type { TranslationJobForToast } from "@/app/[locale]/_hooks/use-translation-jobs";
import { Progress } from "@/components/ui/progress";
import {
	CheckCircle2,
	Hourglass,
	Languages,
	LinkIcon,
	Loader2,
	XCircle,
} from "lucide-react";
import Link from "next/link";

const statusIcon = (status: string) => {
	switch (status) {
		case "PENDING":
			return (
				<Hourglass className="h-4 w-4 animate-bounce text-muted-foreground" />
			);
		case "IN_PROGRESS":
			return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
		case "COMPLETED":
			return <CheckCircle2 className="h-4 w-4 text-green-500" />;
		case "FAILED":
			return <XCircle className="h-4 w-4 text-red-500" />;
		default:
			return null;
	}
};

export const JobsView = ({ jobs }: { jobs: TranslationJobForToast[] }) => (
	<div className="w-64 py-2">
		<p className="text-sm font-medium mb-2 flex items-center">
			<Languages className="w-4 h-4 mr-2" />
			Translation Jobs
		</p>
		{jobs.map((j) => (
			<div key={j.locale} className="mb-2 last:mb-0">
				<span className="flex items-center gap-2">
					{statusIcon(j.status)}
					<Link
						href={`/${j.locale}/user/${j.page.user.handle}/page/${j.page.slug}`}
						className="capitalize  min-w-[48px] hover:underline cursor-pointer flex items-center"
					>
						<LinkIcon className="w-4 h-4 mr-1" />
						{j.locale}
					</Link>
					<Progress
						value={j.progress ?? (j.status === "COMPLETED" ? 100 : 0)}
						className="flex-1 h-2 mx-2"
					/>
				</span>
				{j.error && <p className="text-xs text-red-500 mt-1">{j.error}</p>}
			</div>
		))}
	</div>
);
