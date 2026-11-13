import { createElement } from "react";
import { cn } from "@/lib/utils";

export function UserAvatar({
	image,
	name,
	className,
}: {
	image: string | null;
	name: string;
	className: string;
}) {
	return createElement(
		"evame-avatar",
		{
			class: cn(
				"relative flex shrink-0 overflow-hidden rounded-full",
				className,
			),
		},
		<>
			<span
				aria-hidden={image ? "true" : undefined}
				className="flex h-full w-full items-center justify-center rounded-full bg-muted"
			>
				{name.charAt(0).toUpperCase()}
			</span>
			<img
				alt={name}
				className="absolute inset-0 aspect-square h-full w-full"
				decoding="async"
				height={40}
				loading="lazy"
				src={image ?? undefined}
				style={{ opacity: 0 }}
				width={40}
			/>
		</>,
	);
}
