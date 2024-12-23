import { NavLink, type NavLinkProps, useParams } from "@remix-run/react";

// NavLinkProps を継承
type NavLocaleLinkProps = Omit<NavLinkProps, "to"> & {
	to: string;
};

export function NavLocaleLink({
	to,
	className,
	children,
	...rest
}: NavLocaleLinkProps) {
	const { locale } = useParams();

	const normalized = to.startsWith("/") ? to.slice(1) : to;
	const path = `/${locale}/${normalized}`;

	return (
		<NavLink to={path} className={className} {...rest}>
			{children}
		</NavLink>
	);
}
