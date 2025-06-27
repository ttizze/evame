"use client";
import { useEffect } from "react";
import { useDisplay } from "@/app/_context/display-provider";

/** レンダリングなしで sourceLocale を Provider にセットする */
export function SourceLocaleBridge({ locale }: { locale: string }) {
	const { setSourceLocale } = useDisplay();
	useEffect(() => {
		setSourceLocale(locale);
	}, [locale, setSourceLocale]);
	return null;
}
