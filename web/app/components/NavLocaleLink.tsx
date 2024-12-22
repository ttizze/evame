import { NavLink, useMatches, type NavLinkProps } from "@remix-run/react";

function useRootData() {
  const matches = useMatches();
  const rootMatch = matches.find((match) => match.id === "root");
  return rootMatch?.data as { locale?: string } | undefined;
}

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
  const rootData = useRootData();
  const locale = rootData?.locale ?? "en";

  // 先頭のスラッシュを削除したうえで "/:locale" を付与
  const normalized = to.startsWith("/") ? to.slice(1) : to;
  const path = `/${locale}/${normalized}`;

  return (
    <NavLink
      to={path}
      // className が「文字列」or「コールバック」どちらでもOK
      className={className}
      {...rest}
    >
      {children}
    </NavLink>
  );
}
