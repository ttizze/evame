import {
	type ComponentPropsWithoutRef,
	forwardRef,
	useSyncExternalStore,
} from "react";
import { ThemeButton } from "../../../shared/header/theme-button";
import {
	getReaderTheme,
	setReaderTheme,
	subscribeReaderTheme,
} from "../theme.client";

export const ReaderThemeToggle = forwardRef<
	HTMLButtonElement,
	ComponentPropsWithoutRef<"button">
>((props, ref) => {
	const theme = useSyncExternalStore(subscribeReaderTheme, getReaderTheme);
	return (
		<ThemeButton
			{...props}
			changeTheme={setReaderTheme}
			isLight={theme === "light"}
			ref={ref}
		/>
	);
});
ReaderThemeToggle.displayName = "ReaderThemeToggle";
