import { PencilIcon } from "lucide-react";
import { generateSlug } from "@/app/[locale]/_utils/generate-slug";

export function NewPageButton({
	handle,
	locale,
}: {
	handle: string;
	locale: string;
}) {
	return (
		<button
			aria-label="Create a new page"
			className="cursor-pointer items-center"
			onClick={() =>
				window.location.assign(`/${locale}/${handle}/${generateSlug()}/edit`)
			}
			type="button"
		>
			<PencilIcon className="h-6 w-6" />
		</button>
	);
}
