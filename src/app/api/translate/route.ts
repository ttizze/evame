import { withQstashVerification } from "./_utils/with-qstash-signature";
import { postTranslate } from "./handler";

export const POST = withQstashVerification(postTranslate);
