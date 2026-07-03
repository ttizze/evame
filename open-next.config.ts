import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";

export default defineCloudflareConfig({
	// ISR / SSG / "use cache" のキャッシュを R2 に保存する
	incrementalCache: r2IncrementalCache,
	// ISR の再検証キュー (Durable Object)
	queue: doQueue,
	// revalidateTag / revalidatePath 用のタグキャッシュ (Durable Object)
	tagCache: doShardedTagCache({ baseShardSize: 12 }),
	// NOTE: enableCacheInterception は cacheComponents (PPR) と併用できないため無効のまま
});
