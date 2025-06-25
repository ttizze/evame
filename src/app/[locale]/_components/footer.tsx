import Link from 'next/link';
import { FaDiscord, FaGithub } from 'react-icons/fa';
import { Link as LinkI18n } from '@/i18n/routing';

export function Footer() {
  return (
    <footer className="mt-auto grid h-60 place-items-center">
      <div className="w-full ">
        <div className="flex items-center justify-center gap-4 text-gray-600 text-sm dark:text-gray-300">
          <LinkI18n
            className="hover:text-gray-900 dark:hover:text-white"
            href="/about"
          >
            About
          </LinkI18n>
          <LinkI18n
            className="hover:text-gray-900 dark:hover:text-white"
            href="/privacy"
          >
            Privacy Policy
          </LinkI18n>
          <LinkI18n
            className="hover:text-gray-900 dark:hover:text-white"
            href="/terms"
          >
            Terms of Service
          </LinkI18n>
          <Link
            aria-label="GitHub"
            className="transition-colors"
            href="https://github.com/ttizze/eveeve"
            rel="noopener noreferrer"
            target="_blank"
          >
            <FaGithub size={24} />
          </Link>
          <Link
            aria-label="Discord"
            className="transition-colors"
            href="https://discord.gg/2JfhZdu9zW"
            rel="noopener noreferrer"
            target="_blank"
          >
            <FaDiscord size={24} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
