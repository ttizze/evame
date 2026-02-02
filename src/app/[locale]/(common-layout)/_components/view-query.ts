import { parseAsStringEnum } from "nuqs";
import { DEFAULT_VIEW, VIEW_VALUES, type View } from "@/app/_constants/view";

export const viewQueryState = parseAsStringEnum<View>(VIEW_VALUES)
	.withDefault(DEFAULT_VIEW)
	.withOptions({ shallow: true });
