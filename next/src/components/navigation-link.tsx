"use client";

import { Link } from "@/i18n/routing";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ComponentProps } from "react";

export function NavigationLink({ href, ...rest }: ComponentProps<typeof Link>) {
	const selectedLayoutSegment = useSelectedLayoutSegment();
	const pathname = selectedLayoutSegment ? `/${selectedLayoutSegment}` : "/";
	const isActive = pathname === href;

	return (
		<Link
			aria-current={isActive ? "page" : undefined}
			href={href}
			style={{ fontWeight: isActive ? "bold" : "normal" }}
			{...rest}
		/>
	);
}
