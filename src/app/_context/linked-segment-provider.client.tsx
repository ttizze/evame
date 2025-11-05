"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

interface LinkedSegmentTypeInfo {
	key: string;
	label: string;
	count: number;
}

interface LinkedSegmentsContextValue {
	types: LinkedSegmentTypeInfo[];
	visibleKeys: string[];
	isVisible: (key: string) => boolean;
	toggle: (key: string) => void;
	setVisibility: (key: string, visible: boolean) => void;
}

const LinkedSegmentsContext = createContext<LinkedSegmentsContextValue | null>(
	null,
);

export function LinkedSegmentsProvider({
	children,
	types,
}: {
	children: ReactNode;
	types: LinkedSegmentTypeInfo[];
}) {
	const [visibleSet, setVisibleSet] = useState<Set<string>>(() => new Set());

	const toggle = useCallback(
		(key: string) =>
			setVisibleSet((prev) => {
				const next = new Set(prev);
				if (next.has(key)) {
					next.delete(key);
				} else {
					next.add(key);
				}
				return next;
			}),
		[],
	);

	const setVisibility = useCallback(
		(key: string, visible: boolean) =>
			setVisibleSet((prev) => {
				const next = new Set(prev);
				if (visible) {
					next.add(key);
				} else {
					next.delete(key);
				}
				return next;
			}),
		[],
	);

	const value = useMemo<LinkedSegmentsContextValue>(() => {
		const visibleKeys = Array.from(visibleSet);
		return {
			types,
			visibleKeys,
			isVisible: (key: string) => visibleSet.has(key),
			toggle,
			setVisibility,
		};
	}, [types, visibleSet, toggle, setVisibility]);

	return (
		<LinkedSegmentsContext.Provider value={value}>
			{children}
		</LinkedSegmentsContext.Provider>
	);
}

export function useLinkedSegments(optional = false) {
	const ctx = useContext(LinkedSegmentsContext);
	if (!ctx && !optional) {
		throw new Error(
			"useLinkedSegments must be used within LinkedSegmentsProvider",
		);
	}
	return ctx;
}

export type { LinkedSegmentTypeInfo };
