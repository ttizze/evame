import { Link } from "@tanstack/react-router";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";

export function CommentPagination({
	currentPage,
	totalPages,
}: {
	currentPage: number;
	totalPages: number;
}) {
	const t = useTranslations("Comments");
	if (totalPages <= 1) return null;
	return (
		<nav
			aria-label={t("pagination")}
			className="not-prose flex items-center justify-center gap-4"
		>
			{currentPage > 1 && (
				<Button asChild size="sm" variant="outline">
					<Link
						hash="comments"
						search={(previous) => ({ ...previous, page: currentPage - 1 })}
						to="."
					>
						{t("previous")}
					</Link>
				</Button>
			)}
			<span>{t("page", { page: currentPage, total: totalPages })}</span>
			{currentPage < totalPages && (
				<Button asChild size="sm" variant="outline">
					<Link
						hash="comments"
						search={(previous) => ({ ...previous, page: currentPage + 1 })}
						to="."
					>
						{t("next")}
					</Link>
				</Button>
			)}
		</nav>
	);
}
