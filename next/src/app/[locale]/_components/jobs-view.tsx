import type { TranslationJobForToast } from "@/app/[locale]/_hooks/use-translation-jobs";
import {
	CheckCircle2,
	Hourglass,
	Languages,
	Loader2,
	XCircle,
} from "lucide-react";

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
	<div className="w-64 py-2 ">
		<p className="text-sm font-medium mb-2 flex items-center">
			<Languages className="w-4 h-4 mr-2" />
			Translation Jobs
		</p>
		{jobs.map((j) => (
			<div
				key={j.locale}
				className="flex items-center justify-between mb-1 last:mb-0"
			>
				<span className="flex items-center gap-1">
					{statusIcon(j.status)}
					<span className="capitalize">{j.locale}</span>
				</span>
				<span className="text-xs text-muted-foreground">{j.status}</span>
			</div>
		))}
	</div>
);
