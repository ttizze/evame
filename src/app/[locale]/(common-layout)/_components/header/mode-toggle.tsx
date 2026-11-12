import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { useTranslations } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { cn } from "@/lib/utils";

export const ModeToggle = forwardRef<
	HTMLButtonElement,
	ComponentPropsWithoutRef<"button">
>(({ onClick, className, ...props }, ref) => {
	const { resolvedTheme, setTheme } = useTheme();
	const hydrated = useHydrated();
	const isLight = hydrated && resolvedTheme === "light";
	const t = useTranslations("Header");
	const label = t("themeChange");

	return (
		<button
			{...props}
			aria-label={label}
			className={cn(
				"w-full gap-2 flex cursor-pointer items-center text-sm hover:bg-accent hover:text-accent-foreground",
				className,
			)}
			disabled={!hydrated || props.disabled}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) setTheme(isLight ? "dark" : "light");
			}}
			ref={ref}
			type="button"
		>
			<Sun
				className={`w-4 h-4  ${isLight ? "rotate-0 scale-100 " : "hidden"}`}
			/>
			<Moon
				className={`w-4 h-4 ${isLight ? "hidden" : "rotate-0 scale-100"}`}
			/>
			<span>{label}</span>
		</button>
	);
});

ModeToggle.displayName = "ModeToggle";
