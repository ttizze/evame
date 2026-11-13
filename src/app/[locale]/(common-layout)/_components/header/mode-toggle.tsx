import { useTheme } from "next-themes";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { useHydrated } from "@/app/_hooks/use-hydrated";
import { ThemeButton } from "../../../../../../shared/header/theme-button";

export const ModeToggle = forwardRef<
	HTMLButtonElement,
	ComponentPropsWithoutRef<"button">
>((props, ref) => {
	const { resolvedTheme, setTheme } = useTheme();
	const hydrated = useHydrated();
	return (
		<ThemeButton
			{...props}
			changeTheme={setTheme}
			disabled={!hydrated || props.disabled}
			isLight={hydrated && resolvedTheme === "light"}
			ref={ref}
		/>
	);
});
ModeToggle.displayName = "ModeToggle";
