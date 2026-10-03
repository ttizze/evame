import type { Transaction } from "kysely";
import type { DB } from "@/db/types";

export type TransactionClient = Transaction<DB>;
