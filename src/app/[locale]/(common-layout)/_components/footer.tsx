import { useLocale, useTranslations } from "next-intl";
import { FaDiscord, FaGithub } from "react-icons/fa";

export function Footer() {
	const locale = useLocale();
	const t = useTranslations("Footer");
	return (
		<footer className="mt-auto h-60 grid place-items-center">
			<div className="w-full ">
				<div className="flex justify-center items-center text-sm text-gray-600 dark:text-gray-300 gap-4">
					<a
						className="hover:text-gray-900 dark:hover:text-white"
						href={`/${locale}/about`}
					>
						{t("about")}
					</a>
					<a
						className="hover:text-gray-900 dark:hover:text-white"
						href={`/${locale}/privacy`}
					>
						{t("privacyPolicy")}
					</a>
					<a
						className="hover:text-gray-900 dark:hover:text-white"
						href={`/${locale}/terms`}
					>
						{t("termsOfService")}
					</a>
					<a
						aria-label="GitHub"
						className="transition-colors"
						href="https://github.com/ttizze/eveeve"
						rel="noopener noreferrer"
						target="_blank"
					>
						<FaGithub size={24} />
					</a>
					<a
						aria-label="Discord"
						className="transition-colors"
						href="https://discord.gg/2JfhZdu9zW"
						rel="noopener noreferrer"
						target="_blank"
					>
						<FaDiscord size={24} />
					</a>
				</div>
			</div>
		</footer>
	);
}
