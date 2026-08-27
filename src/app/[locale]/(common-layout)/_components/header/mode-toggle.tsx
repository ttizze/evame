"use client";

import { Moon, Sun } from "lucide-react";
import { forwardRef, useEffect, useState } from "react";

export const ModeToggle = forwardRef<HTMLButtonElement, { showText?: boolean }>(
	({ showText = true }, ref) => {
		const [isLight, setIsLight] = useState(true);

		useEffect(() => {
			setIsLight(!document.documentElement.classList.contains("dark"));
		}, []);

		function toggleTheme() {
			const nextIsLight = !isLight;
			document.documentElement.classList.toggle("dark", !nextIsLight);
			try {
				localStorage.setItem("theme", nextIsLight ? "light" : "dark");
			} catch {
				// Storageが利用できない環境でも表示の切替は維持する。
			}
			setIsLight(nextIsLight);
		}

		return (
			<button
				className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-sm hover:bg-accent hover:text-accent-foreground"
				onClick={toggleTheme}
				ref={ref}
				type="button"
			>
				{isLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
				{showText ? (
					<span>{isLight ? "Light Theme" : "Dark Theme"}</span>
				) : null}
			</button>
		);
	},
);

ModeToggle.displayName = "ModeToggle";
