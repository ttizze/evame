import { NavLink, type NavLinkProps, useParams } from "@remix-run/react";
import { forwardRef } from "react";

// NavLinkProps を継承しつつ、to を上書き
type NavLocaleLinkProps = Omit<NavLinkProps, "to"> & {
	to: string;
};

export const NavLocaleLink = forwardRef<HTMLAnchorElement, NavLocaleLinkProps>(
	function NavLocaleLink({ to, className, children, ...rest }, ref) {
		const { locale } = useParams();
		const normalized = to.startsWith("/") ? to.slice(1) : to;
		const path = `/${locale}/${normalized}`;

		return (
			<NavLink ref={ref} to={path} className={className} {...rest}>
				{children}
			</NavLink>
		);
	},
);
