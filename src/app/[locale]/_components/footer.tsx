import Link from "next/link";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { Link as LinkI18n } from "@/i18n/routing";

export function Footer() {
	return (
		<footer className="mt-auto h-60 grid place-items-center">
			<div className="w-full ">
				<div className="flex justify-center items-center text-sm text-gray-600 dark:text-gray-300 gap-4">
					<LinkI18n
						href="/about"
						className="hover:text-gray-900 dark:hover:text-white"
					>
						About
					</LinkI18n>
					<LinkI18n
						href="/privacy"
						className="hover:text-gray-900 dark:hover:text-white"
					>
						Privacy Policy
					</LinkI18n>
					<LinkI18n
						href="/terms"
						className="hover:text-gray-900 dark:hover:text-white"
					>
						Terms of Service
					</LinkI18n>
					<Link
						href="https://github.com/ttizze/eveeve"
						target="_blank"
						rel="noopener noreferrer"
						className="transition-colors"
						aria-label="GitHub"
					>
						<FaGithub size={24} />
					</Link>
					<Link
						href="https://discord.gg/2JfhZdu9zW"
						target="_blank"
						rel="noopener noreferrer"
						className="transition-colors"
						aria-label="Discord"
					>
						<FaDiscord size={24} />
					</Link>
				</div>
			</div>
		</footer>
	);
}
