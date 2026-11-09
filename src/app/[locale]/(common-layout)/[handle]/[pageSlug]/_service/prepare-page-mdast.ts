import remarkEmbedder from "@remark-embedder/core";
import oembedTransformer from "@remark-embedder/transformer-oembed";
import type { Root } from "mdast";
import remarkLinkCard from "remark-link-card-plus";
import { unified } from "unified";
import type { JsonValue } from "@/db/types";
import { remarkTweet } from "../_components/mdast-to-react/remark-tweet";

const EMBEDDABLE_HOST =
	/^(?:(?:www|m)\.)?(?:youtube\.com|youtu\.be|vimeo\.com|open\.spotify\.com|soundcloud\.com|dailymotion\.com|dai\.ly)$/;

/**
 * 外部サービスやファイルシステムに依存するMarkdown変換をサーバーで済ませる。
 * クライアント側のmdastToReactは、ここで準備済みのASTを純粋に描画する。
 */
export async function preparePageMdast(mdast: JsonValue): Promise<JsonValue> {
	if (!mdast || typeof mdast !== "object" || Array.isArray(mdast)) {
		return mdast;
	}

	const oembed =
		"default" in oembedTransformer
			? (oembedTransformer as { default: typeof oembedTransformer }).default
			: oembedTransformer;
	const processor = unified()
		.use(remarkTweet)
		// CommonJSのdefault exportはWorkersのESMビルドではオブジェクトになる。
		.use(
			typeof remarkEmbedder === "function"
				? remarkEmbedder
				: (remarkEmbedder as { default: typeof remarkEmbedder }).default,
			{
				transformers: [
					{
						...oembed,
						// 描画時のサニタイズで残せる埋め込み先だけを変換し、他はリンクカードにする。
						shouldTransform: (url: string) =>
							EMBEDDABLE_HOST.test(new URL(url).hostname) &&
							oembed.shouldTransform(url),
					},
				],
			},
		)
		.use(remarkLinkCard, {
			cache: false,
			shortenUrl: true,
			noFavicon: true,
		});

	const prepared = await processor.run(mdast as unknown as Root);
	return prepared as unknown as JsonValue;
}
