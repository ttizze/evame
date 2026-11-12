import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { forwardRef } from "react";
import { useTranslations } from "use-intl";
import { useHydrated } from "@/app/_hooks/use-hydrated";

export const ModeToggle = forwardRef<HTMLButtonElement>((_, ref) => {
	const { resolvedTheme, setTheme } = useTheme();
	const hydrated = useHydrated();
	const isLight = hydrated && resolvedTheme === "light";
	const t = useTranslations("Header");
	const label = t(isLight ? "darkTheme" : "lightTheme");

	function toggleTheme() {
		setTheme(isLight ? "dark" : "light");
	}

	return (
		<button
			aria-label={label}
			className="w-full gap-2 flex cursor-pointer items-center px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground"
			disabled={!hydrated}
			onClick={toggleTheme}
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
