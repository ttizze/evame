import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const config: NextConfig = {
	experimental: {
		serverActions: {
			bodySizeLimit: "5mb",
		},
	},
};

export default withNextIntl(config);
