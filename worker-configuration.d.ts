/// <reference types="@cloudflare/workers-types" />

/**
 * Wranglerの `cf-typegen` 出力先です。
 * バインディングの型は src/env.d.ts でアプリケーション側に宣言します。
 */
interface CloudflareEnv extends Env {}
