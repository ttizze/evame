// LocaleLink.tsx
import { Link, useMatches } from "@remix-run/react";

function useRootData() {
  const matches = useMatches();
  const rootMatch = matches.find((match) => match.id === "root");
  return rootMatch?.data as { locale: string } | undefined;
}

export function LocaleLink({
	to,
	children,
	className,
}: {
	to: string;
	children: React.ReactNode;
	className?: string;
}) {
	const rootData = useRootData();
	const locale = rootData?.locale ?? "en";

	const path = `/${locale}${to}`;

	return <Link to={path} className={className}>{children}</Link>;
}
