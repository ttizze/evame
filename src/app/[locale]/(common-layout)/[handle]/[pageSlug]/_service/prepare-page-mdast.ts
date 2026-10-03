import remarkEmbedder from "@remark-embedder/core";
import oembedTransformer from "@remark-embedder/transformer-oembed";
import type { Root } from "mdast";
import remarkLinkCard from "remark-link-card-plus";
import { unified } from "unified";
import type { JsonValue } from "@/db/types";
import { remarkTweet } from "../_components/mdast-to-react/remark-tweet";

/**
 * 外部サービスやファイルシステムに依存するMarkdown変換をサーバーで済ませる。
 * クライアント側のmdastToReactは、ここで準備済みのASTを純粋に描画する。
 */
export async function preparePageMdast(mdast: JsonValue): Promise<JsonValue> {
	if (!mdast || typeof mdast !== "object" || Array.isArray(mdast)) {
		return mdast;
	}

	const processor = unified()
		.use(remarkTweet)
		.use(remarkEmbedder, { transformers: [oembedTransformer] })
		.use(remarkLinkCard, {
			cache: false,
			shortenUrl: true,
			noFavicon: true,
		});

	const prepared = await processor.run(mdast as unknown as Root);
	return prepared as unknown as JsonValue;
}
