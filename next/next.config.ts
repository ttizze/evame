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
	images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.eveeve.org',
        port: '',
        pathname: '/uploads/**',
        search: '',
      },
			{
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/evame/uploads/**',
      },
    ],
  },
};

export default withNextIntl(config);
