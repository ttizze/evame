import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		tanstackStart(),
		nitro({
			serverAssets: [
				{
					baseName: "og",
					dir: "./public",
					pattern: "{logo.png,inter-semi-bold.ttf,BIZUDPGothic-Bold.ttf}",
				},
			],
		}),
		viteReact(),
	],
});
