import { useParams, useSubmit } from "@remix-run/react";

export function useMoveLocale() {
	const params = useParams();
	const submit = useSubmit();

	return (value: string) => {
		const { userName, slug } = params;
		const formData = new FormData();
		formData.set("locale", value);
		formData.set("userName", userName ?? "");
		formData.set("slug", slug ?? "");
		submit(formData, {
			method: "post",
			action: "/resources/locale-selector",
		});
	};
}
