import { uploadImage } from "@/app/[locale]/_service/upload/upload-image";
import { authenticateToken } from "@/app/api/_service/authenticate-token";

const imageIdPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * アプリの画像を保存する。保存先を利用者と端末の画像IDで決めるため、応答を失って送り直しても画像は増えない。
 */
export async function postAppImage(request: Request): Promise<Response> {
	const auth = await authenticateToken(request);
	if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
	const form = await request.formData().catch(() => null);
	const id = form?.get("id");
	const image = form?.get("image");
	if (
		typeof id !== "string" ||
		!imageIdPattern.test(id) ||
		!(image instanceof File)
	)
		return Response.json({ error: "Invalid image" }, { status: 422 });

	// iPhoneのUUIDは大文字なので、小文字にそろえて同じ画像を同じ保存先にする。
	const result = await uploadImage(
		image,
		`app/${auth.userId}/${id.toLowerCase()}`,
	);
	if (!result.success)
		return Response.json({ error: result.message }, { status: 422 });
	return Response.json({ url: result.data.imageUrl });
}
