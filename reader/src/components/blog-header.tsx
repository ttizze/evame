import { useTranslations } from "use-intl";
import { authClient } from "@/app/[locale]/_service/auth-client";
import { LocaleSelector } from "@/app/[locale]/(common-layout)/_components/header/locale-selector/client";
import { ModeToggle } from "@/app/[locale]/(common-layout)/_components/header/mode-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function BlogHeader({
	locale,
	handle,
	name,
	image,
}: {
	locale: string;
	handle: string;
	name: string;
	image: string | null;
}) {
	const { data: session } = authClient.useSession();
	const t = useTranslations("Blog");
	return (
		<header className="border-b border-border/60" data-blog-header>
			<div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-6">
				<a
					className="flex min-w-0 items-center gap-3 font-semibold text-lg"
					href={`/${locale}/${handle}`}
				>
					<Avatar aria-hidden="true" className="h-9 w-9 shrink-0">
						<AvatarImage
							alt=""
							height={36}
							src={image ?? undefined}
							width={36}
						/>
						<AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
					</Avatar>
					<span>{name}</span>
				</a>
				<nav
					aria-label={t("navigation")}
					className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm"
				>
					<a
						className="hover:underline underline-offset-4"
						href={`/${locale}/${handle}`}
					>
						{t("articles")}
					</a>
					<LocaleSelector
						currentHandle={session?.user.handle}
						hasGeminiApiKey={session?.user.hasGeminiApiKey ?? false}
						localeSelectorClassName="w-auto max-w-40 rounded-full"
						userPlan={session?.user.plan ?? "free"}
					/>
					<ModeToggle showText={false} />
				</nav>
			</div>
		</header>
	);
}
