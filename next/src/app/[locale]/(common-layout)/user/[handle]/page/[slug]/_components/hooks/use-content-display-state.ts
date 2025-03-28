"use client";

import { useQueryState } from "nuqs";
import { useEffect } from "react";

interface UseContentDisplayStateOptions {
	currentLocale?: string;
	sourceLocale?: string;
}

export function useContentDisplayState(
	options: UseContentDisplayStateOptions = {},
) {
	const { currentLocale, sourceLocale } = options;

	// ソースロケールと現在のロケールが同じ場合は翻訳を表示しない
	const shouldShowTranslationByDefault =
		!currentLocale || !sourceLocale || currentLocale !== sourceLocale;

	const [showOriginal, setShowOriginal] = useQueryState("showOriginal", {
		defaultValue: true,
		parse: (val) => val === "true",
		serialize: (val) => (val ? "true" : "false"),
		shallow: true,
	});

	const [showTranslation, setShowTranslation] = useQueryState(
		"showTranslation",
		{
			defaultValue: shouldShowTranslationByDefault,
			parse: (val) => val === "true",
			serialize: (val) => (val ? "true" : "false"),
			shallow: true,
		},
	);

	// ソースロケールと同じ場合は自動的に翻訳を非表示にする
	useEffect(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const hasExplicitShowTranslation = urlParams.has("showTranslation");

		// 明示的な設定がなく、ソースロケールと同じ場合は翻訳を非表示に
		if (
			!hasExplicitShowTranslation &&
			currentLocale &&
			sourceLocale &&
			currentLocale === sourceLocale
		) {
			setShowTranslation(false);
		}
	}, [currentLocale, sourceLocale, setShowTranslation]);

	return {
		showOriginal,
		setShowOriginal,
		showTranslation,
		setShowTranslation,
		isTranslationAvailable: shouldShowTranslationByDefault,
	};
}
