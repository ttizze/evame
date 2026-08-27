import { ClientOnly } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderScroll } from "./header-scroll.client";
import { HeaderUserSlot } from "./user-slot.client";

function HeaderBrand({ locale }: { locale: string }) {
	return (
		<a className="flex items-center" href={`/${locale}`}>
			<img
				alt="Evame"
				aria-label="Evame Logo"
				className="h-8 w-8 dark:invert md:hidden"
				height={32}
				src="/favicon.png"
				width={32}
			/>
			<img
				alt="Evame"
				aria-label="Evame Logo"
				className="h-8 w-20 dark:invert hidden md:block"
				height={32}
				src="/logo.png"
				width={80}
			/>
		</a>
	);
}

function HeaderFallback({ locale }: { locale: string }) {
	return (
		<div>
			<header className="z-50 bg-background rounded-b-3xl transition-all duration-300 translate-y-0 max-w-3xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center">
				<div className="flex items-center gap-4">
					<HeaderBrand locale={locale} />
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-3">
						<Skeleton className="h-6 w-[150px]" />
						<Skeleton className="h-6 w-20" />
					</div>
				</div>
			</header>
		</div>
	);
}

export function Header({ locale = "en" }: { locale?: string } = {}) {
	return (
		<ClientOnly fallback={<HeaderFallback locale={locale} />}>
			<HeaderScroll>
				<div className="flex items-center gap-4">
					<HeaderBrand locale={locale} />
				</div>
				<div className="flex items-center gap-4">
					<HeaderUserSlot locale={locale} />
				</div>
			</HeaderScroll>
		</ClientOnly>
	);
}
