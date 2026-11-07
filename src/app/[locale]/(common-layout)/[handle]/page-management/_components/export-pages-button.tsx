import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";

export function ExportPagesButton() {
	const t = useTranslations("PageExport");
	const [preparing, setPreparing] = useState(false);
	return (
		<div className="mb-6 space-y-2">
			<Button
				className="gap-2"
				disabled={preparing}
				onClick={async () => {
					setPreparing(true);
					try {
						const response = await fetch("/api/export-pages");
						if (response.status === 401) {
							toast.error(t("signInRequired"));
							return;
						}
						if (
							!response.ok ||
							!response.headers
								.get("content-type")
								?.startsWith("application/zip")
						)
							throw new Error("Export failed");
						const url = URL.createObjectURL(await response.blob());
						const link = document.createElement("a");
						link.href = url;
						link.download = "evame-export.zip";
						document.body.append(link);
						link.click();
						link.remove();
						// ダウンロード開始前にBlob URLを失効させない。
						setTimeout(() => URL.revokeObjectURL(url), 1000);
						toast.success(t("done"));
					} catch {
						toast.error(t("failed"));
					} finally {
						setPreparing(false);
					}
				}}
				type="button"
				variant="outline"
			>
				{preparing ? (
					<Loader2 aria-hidden className="h-4 w-4 animate-spin" />
				) : (
					<Download aria-hidden className="h-4 w-4" />
				)}
				{t(preparing ? "preparing" : "button")}
			</Button>
			<p className="text-sm text-muted-foreground">{t("description")}</p>
			<p className="text-sm text-muted-foreground">{t("imageNote")}</p>
		</div>
	);
}
