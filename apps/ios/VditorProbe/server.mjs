import { resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "../.build/vditor-web");
Bun.serve({
	hostname: "127.0.0.1",
	port: 4179,
	async fetch(request) {
		const pathname = decodeURIComponent(new URL(request.url).pathname);
		const path = resolve(
			root,
			`.${pathname === "/" ? "/index.html" : pathname}`,
		);
		if (!path.startsWith(root + sep))
			return new Response(null, { status: 403 });
		const file = Bun.file(path);
		return (await file.exists())
			? new Response(file)
			: new Response(null, { status: 404 });
	},
});
