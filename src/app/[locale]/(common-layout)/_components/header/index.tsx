import type { ReactNode } from "react";
import { HeaderScroll } from "./header-scroll";

export function HeaderFrame({
	locale,
	brand,
	userSlot,
}: {
	locale: string;
	brand: ReactNode;
	userSlot: ReactNode;
}) {
	return (
		<HeaderScroll>
			<div className="flex min-w-0 items-center gap-4">
				{brand ?? (
					<a className="flex items-center" href={`/${locale}`}>
						<img
							alt="Evame"
							aria-label="Evame Logo"
							className="h-8 w-8 dark:invert md:hidden"
							height={32}
							src="/favicon.svg"
							width={32}
						/>
						<img
							alt="Evame"
							aria-label="Evame Logo"
							className="h-8 w-20 dark:invert hidden md:block"
							height={32}
							src="/logo.svg"
							width={80}
						/>
					</a>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-4">{userSlot}</div>
		</HeaderScroll>
	);
}
