export const VIEWS = ["user", "source", "both"] as const;
export type View = (typeof VIEWS)[number];
export const DEFAULT_VIEW: View = "both";
export const VIEW_VALUES: View[] = [...VIEWS];
