"use client";

import type { ReactNode } from "react";
import { useHeaderScroll } from "./hooks/use-header-scroll";

interface HeaderScrollProps {
	children: ReactNode;
}

export function HeaderScroll({ children }: HeaderScrollProps) {
	const { headerRef, isPinned, isVisible, headerHeight } = useHeaderScroll();

	return (
		<div ref={headerRef}>
			<header
				className={`z-50 bg-background rounded-b-3xl transition-all duration-300 ${
					!isVisible ? "-translate-y-full" : "translate-y-0"
				} ${
					isPinned
						? "fixed top-0 left-0 right-0 shadow-md dark:shadow-gray-900"
						: ""
				} max-w-3xl mx-auto py-2 md:py-4 px-2 md:px-6 lg:px-8 flex justify-between items-center`}
			>
				{children}
			</header>
			{isPinned && <div style={{ height: `${headerHeight}px` }} />}
		</div>
	);
}
