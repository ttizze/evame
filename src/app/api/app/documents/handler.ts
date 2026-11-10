import { authenticateToken } from "@/app/api/_service/authenticate-token";
import type { JsonValue } from "@/db/types";
import { listDocumentPages } from "../_db/queries";
import { toAppDocument } from "../_domain/app-document";

/** 自分の文書を返す。Markdownへ変換できない文書があっても、他の文書と変換できない文書のslugを返す。 */
export async function getAppDocuments(request: Request): Promise<Response> {
	const auth = await authenticateToken(request);
	if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

	const documents = [];
	const failed = [];
	for (const page of await listDocumentPages(auth.userId)) {
		try {
			documents.push(
				toAppDocument({
					slug: page.slug,
					title: page.title ?? "",
					mdastJson: page.mdastJson as JsonValue,
					status: page.status,
				}),
			);
		} catch {
			failed.push({ slug: page.slug });
		}
	}
	return Response.json({ documents, failed });
}
