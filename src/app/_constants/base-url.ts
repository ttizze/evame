export const BASE_URL =
	import.meta.env.VITE_PUBLIC_DOMAIN ??
	(import.meta.env.PROD ? "https://evame.tech" : "http://localhost:3000");
