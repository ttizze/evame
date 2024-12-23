// LocaleLink.tsx
import { Link, useParams } from "@remix-run/react";

export function LocaleLink({
	to,
	children,
	className,
}: {
	to: string;
	children: React.ReactNode;
	className?: string;
}) {
	const { locale } = useParams();

	const path = `/${locale}${to}`;

	return (
		<Link to={path} className={className}>
			{children}
		</Link>
	);
}
