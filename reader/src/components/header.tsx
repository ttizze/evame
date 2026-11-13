import { ThemeProvider } from "next-themes";
import { HeaderFrame } from "@/app/[locale]/(common-layout)/_components/header";
import { HeaderUserSlot } from "@/app/[locale]/(common-layout)/_components/header/user-slot.client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import { IslandProviders } from "./providers";

export function HeaderIsland({
	locale,
	search,
	showHeader,
	blog,
}: {
	locale: string;
	search: string;
	showHeader: boolean;
	blog: { handle: string; name: string; image: string | null } | null;
}) {
	return (
		<IslandProviders locale={locale} search={search}>
			<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
				{showHeader && (
					<HeaderFrame
						brand={
							blog ? (
								<a
									className="flex min-w-0 items-center gap-2 font-semibold"
									href={`/${locale}/${blog.handle}`}
								>
									<Avatar aria-hidden="true" className="h-8 w-8">
										<AvatarImage
											alt=""
											height={32}
											src={blog.image ?? undefined}
											width={32}
										/>
										<AvatarFallback>
											{blog.name.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<span className="truncate">{blog.name}</span>
								</a>
							) : null
						}
						locale={locale}
						userSlot={<HeaderUserSlot locale={locale} />}
					/>
				)}
				<Toaster closeButton richColors />
			</ThemeProvider>
		</IslandProviders>
	);
}
