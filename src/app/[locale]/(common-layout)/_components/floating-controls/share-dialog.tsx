import { Share } from "lucide-react";
import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

const ShareOptions = lazy(() => import("./share-options"));

export function ShareDialog() {
	const t = useTranslations("ShareDialog");
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					aria-label={t("trigger")}
					className="h-10 w-10 rounded-full bg-background cursor-pointer"
					size="icon"
					variant="ghost"
				>
					<Share className="h-5 w-5" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md rounded-3xl p-6">
				<DialogHeader>
					<DialogTitle className="text-center">Share</DialogTitle>
				</DialogHeader>
				<Suspense fallback={null}>
					<ShareOptions />
				</Suspense>
			</DialogContent>
		</Dialog>
	);
}
