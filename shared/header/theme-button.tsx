import { Moon, Sun } from "lucide-react";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { useTranslations } from "use-intl";
import { cn } from "../../src/lib/utils";

export const ThemeButton = forwardRef<
	HTMLButtonElement,
	ComponentPropsWithoutRef<"button"> & {
		isLight: boolean;
		changeTheme: (theme: "light" | "dark") => void;
	}
>(({ isLight, changeTheme, onClick, className, ...props }, ref) => {
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
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) changeTheme(isLight ? "dark" : "light");
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
ThemeButton.displayName = "ThemeButton";
