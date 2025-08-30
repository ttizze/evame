import Image from "next/image";
import { Link } from "@/i18n/routing";
import { HeaderScroll } from "./header-scroll.client";
import { HeaderUserSlot } from "./user-slot.client";

export function Header() {
	return (
		<HeaderScroll>
			<div className="flex items-center gap-4">
				<Link className="flex items-center" href="/">
					<Image
						alt="Evame"
						aria-label="Evame Logo"
						className="h-8 w-8 dark:invert md:hidden"
						height={32}
						src="/favicon.svg"
						width={32}
					/>
					<Image
						alt="Evame"
						aria-label="Evame Logo"
						className="h-8 w-20 dark:invert hidden md:block"
						height={32}
						src="/logo.svg"
						width={80}
					/>
				</Link>
			</div>
			<div className="flex items-center gap-4">
				<HeaderUserSlot />
			</div>
		</HeaderScroll>
	);
}
