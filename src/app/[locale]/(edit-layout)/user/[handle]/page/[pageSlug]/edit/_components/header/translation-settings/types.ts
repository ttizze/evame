import type { Selectable } from "kysely";
import type { TranslationContexts } from "@/db/types";

export type TranslationContext = Pick<
	Selectable<TranslationContexts>,
	"id" | "name" | "context"
>;
