import { useLocation, useSubmit } from "@remix-run/react";

export function useMoveLocale() {
	const location = useLocation();
	const submit = useSubmit();

	return (newLocale: string) => {
		const currentUrl = location.pathname + location.search + location.hash;

		const formData = new FormData();
		formData.set("locale", newLocale);
		formData.set("currentUrl", currentUrl);

		submit(formData, {
			method: "post",
			action: "/resources/locale-selector",
		});
	};
}
