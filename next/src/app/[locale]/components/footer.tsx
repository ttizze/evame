import { Link } from "@/i18n/routing";
import { FaDiscord, FaGithub } from "react-icons/fa";

export function Footer() {
	return (
		<footer className="mt-auto">
			<div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
				<div className="flex justify-center items-center text-sm text-gray-600 dark:text-gray-300 gap-4">
					<Link
						href="/privacy"
						className="hover:text-gray-900 dark:hover:text-white"
					>
						Privacy Policy
					</Link>
					<Link
						href="/terms"
						className="hover:text-gray-900 dark:hover:text-white"
					>
						Terms of Service
					</Link>
					<a
						href="https://github.com/ttizze/eveeve"
						target="_blank"
						rel="noopener noreferrer"
						className="transition-colors"
					>
						<FaGithub size={24} />
					</a>
					<a
						href="https://discord.gg/2JfhZdu9zW"
						target="_blank"
						rel="noopener noreferrer"
						className="transition-colors"
					>
						<FaDiscord size={24} />
					</a>
				</div>
			</div>
		</footer>
	);
}
